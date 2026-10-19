/** E4 integration: propose → old value stands → decide → applied/rejected. */

import {
  addMovement,
  collectInstallment,
  createLoan,
  decideMovementChange,
  getLoanDetail,
  listGroupInstallments,
  listMovementHistory,
  listMovements,
  listPendingChanges,
  proposeMovementChange,
} from "@tests/support/use-cases";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Installments, Users } from "@/backend/infra/db/schema";
import { deriveCapital } from "@/backend/modules/capital/domain/derive";
import { createGroup, joinGroup } from "@/backend/modules/groups/data";
import { generateSchedule } from "@/backend/modules/loans/domain/schedule";
import { validateNewMovement } from "@/backend/modules/movements/domain/validate";
import { truncateAll } from "@/test/truncate";

const TODAY = "2026-07-09";

async function seed() {
  const [ana] = await db
    .insert(Users)
    .values({ clerkId: "clerk_ana", name: "Ana", email: "a@test.pe" })
    .returning();
  const [rosa] = await db
    .insert(Users)
    .values({ clerkId: "clerk_rosa", name: "Rosa", email: "r@test.pe" })
    .returning();
  const created = await createGroup(ana.id, "Inversiones DR");
  if (!created.ok) throw new Error("seed failed");
  await joinGroup(rosa.id, created.value.inviteCode);

  const contribute = validateNewMovement({
    type: "contribute",
    amountSoles: "50",
    today: TODAY,
  });
  if (!contribute.ok) throw new Error("seed failed");
  const movement = await addMovement(
    created.value.id,
    ana.id,
    contribute.value,
  );
  return { ana, rosa, group: created.value, movement };
}

const editedTo45 = (m: { type: "contribute" }) => ({
  type: m.type,
  amount: 4500,
  cost: null,
  concept: "aporte corregido",
  date: TODAY,
});

beforeEach(truncateAll);

describe("E4: the D1 story — Ana cambió S/50 → S/45", () => {
  it("propose → pending; ledger still shows S/50; Rosa approves → S/45", async () => {
    const { ana, rosa, group, movement } = await seed();

    const proposed = await proposeMovementChange(
      group.id,
      ana.id,
      movement.id,
      "edit",
      editedTo45({ type: "contribute" }),
    );
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;

    // The OLD value is still the truth
    const ledger = await listMovements(group.id);
    expect(ledger[0].amount).toBe(5000);

    // Rosa sees it pending
    const pending = await listPendingChanges(group.id);
    expect(pending).toHaveLength(1);
    expect(pending[0].proposerName).toBe("Ana");
    expect(pending[0].after?.amount).toBe(4500);

    // Ana cannot decide her own change (the trust rule, at the data layer)
    const selfTry = await decideMovementChange(
      group.id,
      ana.id,
      proposed.value.pendingId,
      "approve",
    );
    expect(!selfTry.ok && selfTry.error.kind === "SelfApproval").toBe(true);

    // Rosa approves → applied
    const approved = await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    );
    expect(approved.ok && approved.value.applied).toBe(true);
    const after = await listMovements(group.id);
    expect(after[0].amount).toBe(4500);
    expect(after[0].concept).toBe("aporte corregido");

    // History is immutable and complete
    const history = await listMovementHistory(group.id, movement.id);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      status: "approved",
      proposerName: "Ana",
      deciderName: "Rosa",
    });
    expect(history[0].before.amount).toBe(5000);
    expect(history[0].after?.amount).toBe(4500);
  });

  it("reject keeps the original untouched", async () => {
    const { ana, rosa, group, movement } = await seed();
    const proposed = await proposeMovementChange(
      group.id,
      ana.id,
      movement.id,
      "edit",
      editedTo45({ type: "contribute" }),
    );
    if (!proposed.ok) throw new Error("propose failed");

    const rejected = await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "reject",
    );
    expect(rejected.ok && rejected.value.applied === false).toBe(true);
    expect((await listMovements(group.id))[0].amount).toBe(5000);
    expect(await listPendingChanges(group.id)).toHaveLength(0);
    // ...but the attempt stays in history forever
    const history = await listMovementHistory(group.id, movement.id);
    expect(history[0].status).toBe("rejected");
  });

  it("approved void excludes the movement from capital but keeps it visible", async () => {
    const { ana, rosa, group, movement } = await seed();
    const proposed = await proposeMovementChange(
      group.id,
      ana.id,
      movement.id,
      "void",
    );
    if (!proposed.ok) throw new Error("propose failed");
    await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    );

    const ledger = await listMovements(group.id);
    expect(ledger).toHaveLength(1); // still visible — never deleted
    expect(ledger[0].status).toBe("voided");
    expect(deriveCapital(ledger, []).total).toBe(0); // excluded from capital
  });

  it("a lend movement is the loan itself → not even voidable here", async () => {
    const { rosa, group } = await seedLoan();
    const lendMovement = (await listMovements(group.id)).find(
      (m) => m.type === "lend",
    );
    if (!lendMovement) throw new Error("lend movement missing");

    const r = await proposeMovementChange(
      group.id,
      rosa.id,
      lendMovement.id,
      "void",
    );
    expect(!r.ok && r.error.kind === "SystemMovement").toBe(true);
  });
});

/** A loan of S/40 at 10% → 2 cuotas of S/22 (principal 2000 + interés 200). */
async function seedLoan() {
  const { ana, rosa, group } = await seed();
  const s = generateSchedule({
    capital: 4000,
    ratePercent: 10,
    installmentCount: 2,
    frequency: "weekly",
    startDate: TODAY,
  });
  if (!s.ok) throw new Error("engine failed");
  const created = await createLoan(group.id, ana.id, {
    borrower: { name: "Arturo" },
    capital: 4000,
    rateBps: 1000,
    frequency: "weekly",
    startDate: TODAY,
    installments: s.value.installments,
  });
  if (!created.ok) throw new Error("loan failed");
  return { ana, rosa, group, loanId: created.value.loanId };
}

async function capitalOf(groupId: string) {
  return deriveCapital(
    await listMovements(groupId),
    await listGroupInstallments(groupId),
  );
}

describe("Deshacer cobro: anular un repay devuelve la cuota a pendiente", () => {
  it("un cobro no se edita — su monto pertenece a la cuota", async () => {
    const { ana, rosa, group, loanId } = await seedLoan();
    const loan = await getLoanDetail(group.id, loanId);
    if (!loan.ok) throw new Error("loan missing");
    await collectInstallment(
      group.id,
      ana.id,
      loanId,
      loan.value.installments[0].id,
      TODAY,
    );
    const repay = (await listMovements(group.id)).find(
      (m) => m.type === "repay",
    );
    if (!repay) throw new Error("repay movement missing");

    const edit = await proposeMovementChange(
      group.id,
      rosa.id,
      repay.id,
      "edit",
      { type: "repay", amount: 9999, cost: null, concept: "x", date: TODAY },
    );
    expect(!edit.ok && edit.error.kind === "SystemMovement").toBe(true);
  });

  it("cobrar → deshacer devuelve el capital exactamente a donde estaba", async () => {
    const { ana, rosa, group, loanId } = await seedLoan();

    // Before the collection: every sol of principal is still out on loan, and
    // no interest has been realised.
    const beforeCollect = await capitalOf(group.id);

    expect(beforeCollect.lent).toBe(4000);
    expect(beforeCollect.collectedInterest).toBe(0);

    const loan = await getLoanDetail(group.id, loanId);

    if (!loan.ok) throw new Error("loan missing");

    const cuota1 = loan.value.installments[0];

    // Collecting: the cash comes in, `lent` drops by the principal, and the
    // cuota's interest becomes real — the total grows by exactly that much.
    await collectInstallment(group.id, ana.id, loanId, cuota1.id, TODAY);

    const collected = await capitalOf(group.id);

    expect(collected.lent).toBe(4000 - cuota1.principal);
    expect(collected.collectedInterest).toBe(cuota1.interest);
    expect(collected.total).toBe(beforeCollect.total + cuota1.interest);

    // Ana proposes undoing it. Nothing moves until Rosa says yes: the cuota is
    // still "Cobrada".
    const repay = (await listMovements(group.id)).find(
      (m) => m.type === "repay",
    );

    if (!repay) throw new Error("repay movement missing");

    const proposed = await proposeMovementChange(
      group.id,
      ana.id,
      repay.id,
      "void",
    );

    expect(proposed.ok).toBe(true);

    if (!proposed.ok) return;

    const stillCollected = await getLoanDetail(group.id, loanId);

    expect(
      stillCollected.ok && stillCollected.value.installments[0].status,
    ).toBe("collected");

    // Rosa approves: the cuota goes back to pending and the capital returns to
    // exactly where it started.
    const approved = await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    );

    expect(approved.ok && approved.value.applied).toBe(true);

    const undone = await getLoanDetail(group.id, loanId);

    if (!undone.ok) throw new Error("loan missing");

    expect(undone.value.installments[0].status).toBe("pending");

    // La cuota queda limpia: sin fecha de cobro y sin FK al movimiento anulado.
    const [row] = await db
      .select()
      .from(Installments)
      .where(eq(Installments.id, cuota1.id));
    expect(row.collectedAt).toBeNull();
    expect(row.repayMovementId).toBeNull();

    const afterUndo = await capitalOf(group.id);
    expect(afterUndo).toEqual(beforeCollect); // simetría exacta

    // El movimiento sigue visible, anulado — nunca se borra.
    const repayAfter = (await listMovements(group.id)).find(
      (m) => m.id === repay.id,
    );
    expect(repayAfter?.status).toBe("voided");
  });

  it("deshecho el cobro, la cuota se puede volver a cobrar", async () => {
    const { ana, rosa, group, loanId } = await seedLoan();
    const loan = await getLoanDetail(group.id, loanId);
    if (!loan.ok) throw new Error("loan missing");
    const cuota1 = loan.value.installments[0];

    await collectInstallment(group.id, ana.id, loanId, cuota1.id, TODAY);
    const repay = (await listMovements(group.id)).find(
      (m) => m.type === "repay",
    );
    if (!repay) throw new Error("repay movement missing");
    const proposed = await proposeMovementChange(
      group.id,
      ana.id,
      repay.id,
      "void",
    );
    if (!proposed.ok) throw new Error("propose failed");
    await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    );

    const recollected = await collectInstallment(
      group.id,
      ana.id,
      loanId,
      cuota1.id,
      TODAY,
    );
    expect(recollected.ok).toBe(true);
    const loanNow = await getLoanDetail(group.id, loanId);
    expect(loanNow.ok && loanNow.value.installments[0].status).toBe(
      "collected",
    );
    // El cobro anulado sigue ahí; el nuevo es otro movimiento activo.
    const repays = (await listMovements(group.id)).filter(
      (m) => m.type === "repay",
    );
    expect(repays).toHaveLength(2);
    expect(repays.filter((m) => m.status === "active")).toHaveLength(1);
  });
});

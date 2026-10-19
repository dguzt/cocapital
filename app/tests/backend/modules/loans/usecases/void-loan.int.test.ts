/**
 * Integration: cancelling a whole loan.
 *
 * A loan is cancelled from the loan, through the same doble confirmación as any
 * change: it PROPOSES a void on the loan's own `lend` movement, and only on the
 * partner's approval is the lend + every collection reversed. The capital must
 * return to EXACTLY where it was before the loan ever existed.
 */

import {
  addMovement,
  collectInstallment,
  createGroup,
  createLoan,
  decideMovementChange,
  getLoanDetail,
  joinGroup,
  listGroupInstallments,
  listLoans,
  listMovements,
  listPendingChanges,
  proposeVoidLoan,
} from "@tests/support/use-cases";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Users } from "@/backend/infra/db/schema";
import { CapitalSummary } from "@/backend/modules/capital/domain/capital-summary";
import { Schedule } from "@/backend/modules/loans/domain/schedule";
import { ManualMovement } from "@/backend/modules/movements/domain/manual-movement";
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
  const created = await createGroup(ana, "Inversiones DR");
  if (!created.ok) throw new Error("seed failed");
  await joinGroup(rosa, created.value.inviteCode.value);

  const contribute = ManualMovement.parse({
    type: "contribute",
    amountSoles: "500",
    today: TODAY,
  });
  if (!contribute.ok) throw new Error("seed failed");
  await addMovement(created.value.id, ana.id, contribute.value);
  return { ana, rosa, group: created.value };
}

/** Karina: S/300 at 10% → 4 monthly cuotas (principal 7500 + interés 750). */
async function seedLoan(groupId: string, userId: string) {
  const s = Schedule.generate({
    capital: 30000,
    ratePercent: 10,
    installmentCount: 4,
    frequency: "monthly",
    startDate: TODAY,
  });
  if (!s.ok) throw new Error("engine failed");
  const created = await createLoan(groupId, userId, {
    borrower: { name: "Karina" },
    capital: 30000,
    rateBps: 1000,
    frequency: "monthly",
    startDate: TODAY,
    installments: s.value.installments,
  });
  if (!created.ok) throw new Error("loan failed");
  return created.value.loanId;
}

async function capitalOf(groupId: string) {
  return CapitalSummary.derive(
    await listMovements(groupId),
    await listGroupInstallments(groupId),
  );
}

beforeEach(truncateAll);

describe("anular un préstamo", () => {
  it("con un cobro hecho, anular devuelve el capital exactamente a antes del préstamo", async () => {
    const { ana, rosa, group } = await seed();

    // Baseline: only the S/500 contribution exists.
    const beforeLoan = await capitalOf(group.id);
    expect(beforeLoan.total).toBe(50000);

    const loanId = await seedLoan(group.id, ana.id);
    const loan = await getLoanDetail(group.id, loanId);
    if (!loan.ok) throw new Error("loan missing");

    // Collect one cuota, so the cancellation has a repay to cascade over.
    await collectInstallment(
      group.id,
      ana.id,
      loanId,
      loan.value.installments[0].id,
      TODAY,
    );
    const afterCollect = await capitalOf(group.id);
    expect(afterCollect.lent).toBe(22500);
    expect(afterCollect.collectedInterest).toBe(750);

    // Ana proposes the cancellation — nothing moves until Rosa approves.
    const proposed = await proposeVoidLoan(group.id, ana.id, loanId);
    expect(proposed.ok).toBe(true);
    if (!proposed.ok) return;

    const stillActive = await getLoanDetail(group.id, loanId);
    expect(stillActive.ok && stillActive.value.status).toBe("active");

    // The pending change is a void on the loan's lend movement.
    const pending = await listPendingChanges(group.id);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ kind: "void" });
    expect(pending[0].before.type).toBe("lend");

    // Ana cannot approve her own cancellation (the trust rule).
    const selfTry = await decideMovementChange(
      group.id,
      ana.id,
      proposed.value.pendingId,
      "approve",
    );
    expect(!selfTry.ok && selfTry.error.kind === "SelfApproval").toBe(true);

    // Rosa approves → the whole loan is reversed.
    const approved = await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    );
    expect(approved.ok && approved.value.applied).toBe(true);

    // Loan is voided; its lend and repay movements are voided (never deleted).
    const voided = await getLoanDetail(group.id, loanId);
    expect(voided.ok && voided.value.status).toBe("voided");
    const ledger = await listMovements(group.id);
    expect(ledger.find((m) => m.type === "lend")?.status).toBe("voided");
    expect(ledger.find((m) => m.type === "repay")?.status).toBe("voided");

    // Capital is back to exactly where it was before the loan existed.
    expect(await capitalOf(group.id)).toEqual(beforeLoan);
  });

  it("anular sin cobros también deja el capital intacto", async () => {
    const { ana, rosa, group } = await seed();
    const beforeLoan = await capitalOf(group.id);

    const loanId = await seedLoan(group.id, ana.id);
    const proposed = await proposeVoidLoan(group.id, ana.id, loanId);
    if (!proposed.ok) throw new Error("propose failed");
    await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    );

    expect(await capitalOf(group.id)).toEqual(beforeLoan);
    expect((await listLoans(group.id, TODAY))[0].status).toBe("voided");
  });

  it("un préstamo anulado no se puede cobrar ni volver a anular", async () => {
    const { ana, rosa, group } = await seed();
    const loanId = await seedLoan(group.id, ana.id);
    const loan = await getLoanDetail(group.id, loanId);
    if (!loan.ok) throw new Error("loan missing");
    const cuota1 = loan.value.installments[0];

    const proposed = await proposeVoidLoan(group.id, ana.id, loanId);
    if (!proposed.ok) throw new Error("propose failed");
    await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    );

    const collect = await collectInstallment(
      group.id,
      ana.id,
      loanId,
      cuota1.id,
      TODAY,
    );
    expect(
      !collect.ok && collect.error.kind === "InstallmentNotCollectable",
    ).toBe(true);

    const again = await proposeVoidLoan(group.id, ana.id, loanId);
    expect(!again.ok && again.error.kind === "LoanAlreadyVoided").toBe(true);
  });

  it("no deja anular dos veces en paralelo (una sola propuesta pendiente)", async () => {
    const { ana, group } = await seed();
    const loanId = await seedLoan(group.id, ana.id);

    const first = await proposeVoidLoan(group.id, ana.id, loanId);
    expect(first.ok).toBe(true);

    const second = await proposeVoidLoan(group.id, ana.id, loanId);
    expect(!second.ok && second.error.kind === "ChangeAlreadyPending").toBe(
      true,
    );
  });
});

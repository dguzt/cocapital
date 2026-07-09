/** E4 integration: propose → old value stands → decide → applied/rejected. */
import { beforeEach, describe, expect, it } from "vitest";
import { truncateAll } from "@/test/truncate";
import { db } from "../../infra/db/client";
import { users } from "../../infra/db/schema";
import { deriveCapital } from "../capital/domain/derive";
import { createGroup, joinGroup } from "../groups/data";
import {
  decideMovementChange,
  listMovementHistory,
  listPendingChanges,
  proposeMovementChange,
} from "./changes-data";
import { addMovement, listMovements } from "./data";
import { validateNewMovement } from "./domain/validate";

const TODAY = "2026-07-09";

async function seed() {
  const [ana] = await db
    .insert(users)
    .values({ clerkId: "clerk_ana", name: "Ana", email: "a@test.pe" })
    .returning();
  const [rosa] = await db
    .insert(users)
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

  it("lend/repay movements are system-written → not editable", async () => {
    const { ana, rosa, group } = await seed();
    const { generateSchedule } = await import("../loans/domain/schedule");
    const { createLoan } = await import("../loans/data");
    const s = generateSchedule({
      capital: 10000,
      ratePercent: 10,
      installmentCount: 2,
      frequency: "weekly",
      startDate: TODAY,
    });
    if (!s.ok) throw new Error("engine failed");
    await createLoan(group.id, ana.id, {
      borrower: { name: "Karina" },
      capital: 10000,
      rateBps: 1000,
      frequency: "weekly",
      startDate: TODAY,
      installments: s.value.installments,
    });
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

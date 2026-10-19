/** Integration: create loan → schedule persisted → collect → capital. */

import {
  addMovement,
  collectInstallment,
  createGroup,
  createLoan,
  getLoanDetail,
  getLoanTargetForMovement,
  listBorrowers,
  listGroupInstallments,
  listLoans,
  listMovements,
} from "@tests/support/use-cases";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Users } from "@/backend/infra/db/schema";
import { deriveCapital } from "@/backend/modules/capital/domain/derive";
import { generateSchedule } from "@/backend/modules/loans/domain/schedule";
import { validateNewMovement } from "@/backend/modules/movements/domain/validate";
import { truncateAll } from "@/test/truncate";

const TODAY = "2026-07-09";

async function seed() {
  const [diego] = await db
    .insert(Users)
    .values({ clerkId: "clerk_diego", name: "Diego", email: "d@test.pe" })
    .returning();
  const created = await createGroup(diego, "Inversiones DR");
  if (!created.ok) throw new Error("seed failed");
  const contribute = validateNewMovement({
    type: "contribute",
    amountSoles: "500",
    today: TODAY,
  });
  if (!contribute.ok) throw new Error("seed failed");
  await addMovement(created.value.id, diego.id, contribute.value);
  return { diego, group: created.value };
}

function schedule(input: Partial<Parameters<typeof generateSchedule>[0]> = {}) {
  const r = generateSchedule({
    capital: 30000,
    ratePercent: 10,
    installmentCount: 4,
    frequency: "monthly",
    startDate: TODAY,
    ...input,
  });
  if (!r.ok) throw new Error("engine failed");
  return r.value;
}

/** Karina's sample loan through the real engine. */
const karinaLoan = () => schedule();

beforeEach(truncateAll);

describe("lending lifecycle", () => {
  it("create → collect → capital, end to end", async () => {
    const { diego, group } = await seed();
    const karina = karinaLoan();

    const created = await createLoan(group.id, diego.id, {
      borrower: { name: "Karina" },
      capital: karina.capital,
      rateBps: 1000,
      frequency: "monthly",
      startDate: TODAY,
      installments: karina.installments,
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const ledger = await listMovements(group.id);
    expect(ledger[0].type).toBe("lend");
    expect(ledger[0].amount).toBe(30000);

    // Capital: cash 200, lent 300, total unchanged at 500
    const terms1 = await listGroupInstallments(group.id);
    const cap1 = deriveCapital(ledger, terms1);
    expect(cap1.cash).toBe(20000);
    expect(cap1.lent).toBe(30000);
    expect(cap1.total).toBe(50000);
    expect(cap1.expectedInterest).toBe(3000);

    const list = await listLoans(group.id, TODAY);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      borrowerName: "Karina",
      collectedCount: 0,
      totalCount: 4,
      pendingAmount: 33000,
    });
    const detail = await getLoanDetail(group.id, created.value.loanId);
    expect(detail.ok && detail.value.installments).toHaveLength(4);
    if (!detail.ok) return;

    const first = detail.value.installments[0];
    const collected = await collectInstallment(
      group.id,
      diego.id,
      created.value.loanId,
      first.id,
      TODAY,
    );
    expect(collected.ok && collected.value.amount === 8250).toBe(true);

    // repay movement written with principal share as cost
    const ledger2 = await listMovements(group.id);
    expect(ledger2[0]).toMatchObject({
      type: "repay",
      amount: 8250,
      cost: 7500,
      concept: "Karina · cuota 1",
    });

    // Capital realized the interest: total 500 + 7.50
    const cap2 = deriveCapital(ledger2, await listGroupInstallments(group.id));
    expect(cap2.cash).toBe(28250);
    expect(cap2.lent).toBe(22500);
    expect(cap2.collectedInterest).toBe(750);
    expect(cap2.total).toBe(50750);

    // Double-collect is impossible
    const again = await collectInstallment(
      group.id,
      diego.id,
      created.value.loanId,
      first.id,
      TODAY,
    );
    expect(!again.ok && again.error.kind === "InstallmentNotCollectable").toBe(
      true,
    );
    // ...and it left no orphan repay movement behind
    expect(await listMovements(group.id)).toHaveLength(3);
  });

  it("two partners collecting the same cuota at once book it only once", async () => {
    const { diego, group } = await seed();

    const karina = karinaLoan();

    const created = await createLoan(group.id, diego.id, {
      borrower: { name: "Karina" },
      capital: karina.capital,
      rateBps: 1000,
      frequency: "monthly",
      startDate: TODAY,
      installments: karina.installments,
    });

    if (!created.ok) {
      throw new Error("seed failed");
    }

    const detail = await getLoanDetail(group.id, created.value.loanId);

    if (!detail.ok) {
      throw new Error("seed failed");
    }

    const first = detail.value.installments[0];

    const results = await Promise.all([
      collectInstallment(
        group.id,
        diego.id,
        created.value.loanId,
        first.id,
        TODAY,
      ),
      collectInstallment(
        group.id,
        diego.id,
        created.value.loanId,
        first.id,
        TODAY,
      ),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);

    const repays = (await listMovements(group.id)).filter(
      (movement) => movement.type === "repay",
    );

    expect(repays).toHaveLength(1);
  });

  it("rejects installments that break the invariants", async () => {
    const { diego, group } = await seed();
    const karina = karinaLoan();
    const broken = karina.installments.map((i, idx) =>
      idx === 0 ? { ...i, principal: i.principal + 1 } : i,
    );
    const r = await createLoan(group.id, diego.id, {
      borrower: { name: "Karina" },
      capital: karina.capital,
      rateBps: 1000,
      frequency: "monthly",
      startDate: TODAY,
      installments: broken,
    });
    expect(!r.ok && r.error.kind === "InvalidInstallments").toBe(true);
    // Nothing partial got written
    expect(await listLoans(group.id, TODAY)).toHaveLength(0);
  });

  it("resolves the loan target a ledger row links to (lend + repay)", async () => {
    const { diego, group } = await seed();
    const karina = karinaLoan();
    const created = await createLoan(group.id, diego.id, {
      borrower: { name: "Karina" },
      capital: karina.capital,
      rateBps: 1000,
      frequency: "monthly",
      startDate: TODAY,
      installments: karina.installments,
    });
    if (!created.ok) throw new Error("loan failed");

    // A lend row links to the loan, no cuota to highlight.
    const lend = (await listMovements(group.id)).find((m) => m.type === "lend");
    if (!lend) throw new Error("lend movement missing");
    expect(await getLoanTargetForMovement(group.id, lend.id, "lend")).toEqual({
      loanId: created.value.loanId,
      installmentId: null,
    });

    // A repay row links to the loan AND the exact cuota it collected.
    const detail = await getLoanDetail(group.id, created.value.loanId);
    if (!detail.ok) throw new Error("loan missing");
    const cuota1 = detail.value.installments[0];
    await collectInstallment(
      group.id,
      diego.id,
      created.value.loanId,
      cuota1.id,
      TODAY,
    );
    const repay = (await listMovements(group.id)).find(
      (m) => m.type === "repay",
    );
    if (!repay) throw new Error("repay movement missing");
    expect(await getLoanTargetForMovement(group.id, repay.id, "repay")).toEqual(
      {
        loanId: created.value.loanId,
        installmentId: cuota1.id,
      },
    );

    // Group scope is the auth: another group sees nothing.
    expect(
      await getLoanTargetForMovement(crypto.randomUUID(), lend.id, "lend"),
    ).toBeNull();
  });

  it("existing borrower is reused, not duplicated", async () => {
    const { diego, group } = await seed();
    const karina = karinaLoan();
    const first = await createLoan(group.id, diego.id, {
      borrower: { name: "Karina" },
      capital: karina.capital,
      rateBps: 1000,
      frequency: "monthly",
      startDate: TODAY,
      installments: karina.installments,
    });
    expect(first.ok).toBe(true);

    const list1 = await listBorrowers(group.id);
    expect(list1).toHaveLength(1);

    const second = await createLoan(group.id, diego.id, {
      borrower: { id: list1[0].id },
      capital: 10000,
      rateBps: 1000,
      frequency: "weekly",
      startDate: TODAY,
      installments: schedule({
        capital: 10000,
        installmentCount: 2,
        frequency: "weekly",
      }).installments,
    });
    expect(second.ok).toBe(true);
    expect(await listBorrowers(group.id)).toHaveLength(1); // still one Karina
    expect(await listLoans(group.id, TODAY)).toHaveLength(2);
  });
});

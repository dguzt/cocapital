/** Security audit D: DB round trips per request and whether they grow with the data. */

import {
  createCreditSale,
  createLoan,
  listContacts,
  listCreditSales,
  listGroupInstallments,
  listLoans,
  listMovements,
  listPendingChanges,
  listPlanChanges,
  proposeVoidCreditSale,
  proposeVoidLoan,
} from "@tests/support/use-cases";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { useCases } from "@/backend/application/container";
import { db } from "@/backend/infra/db/client";
import { Schedule } from "@/backend/modules/loans/domain/schedule";
import { truncateAll } from "@/test/truncate";
import { recordQueries } from "./query-counter";
import { seedGroup, TODAY } from "./seed";

beforeEach(truncateAll, 120_000);

async function markAllCollected(
  groupId: string,
  userId: string,
  parentId: string,
  tag: string,
  type: "repay" | "collect_sale",
  table: "installments" | "credit_sale_installments",
  parentColumn: "loan_id" | "sale_id",
  movementColumn: "repay_movement_id" | "collect_movement_id",
) {
  await db.execute(sql`
    INSERT INTO movements (group_id, user_id, type, amount, concept, date)
    SELECT ${groupId}, ${userId}, ${type}::movement_type, 100, ${tag}, '2026-10-18'
    FROM ${sql.raw(table)} WHERE ${sql.raw(parentColumn)} = ${parentId}`);

  await db.execute(sql`
    UPDATE ${sql.raw(table)} i
    SET status = 'collected', collected_at = now(), ${sql.raw(movementColumn)} = m.id
    FROM (
      SELECT id, row_number() OVER (ORDER BY id) AS rn FROM movements WHERE concept = ${tag}
    ) m,
    (
      SELECT id, row_number() OVER (ORDER BY id) AS rn FROM ${sql.raw(table)} WHERE ${sql.raw(parentColumn)} = ${parentId}
    ) t
    WHERE i.id = t.id AND t.rn = m.rn`);
}

async function loanWithCollected(groupId: string, userId: string, n: number) {
  const generated = Schedule.generate({
    capital: 10000,
    ratePercent: 10,
    installmentCount: n,
    frequency: "monthly",
    startDate: TODAY,
  });

  if (!generated.ok) {
    throw new Error("schedule failed");
  }

  const created = await createLoan(groupId, userId, {
    borrower: { name: `Borrower ${n}` },
    capital: 10000,
    rateBps: 1000,
    frequency: "monthly",
    startDate: TODAY,
    installments: generated.value.installments,
  });

  if (!created.ok) {
    throw new Error("createLoan failed");
  }

  await markAllCollected(
    groupId,
    userId,
    created.value.loanId,
    `loan-${n}`,
    "repay",
    "installments",
    "loan_id",
    "repay_movement_id",
  );

  return created.value.loanId;
}

describe("D-rt: write paths loop one query per collected cuota", () => {
  it("voiding a loan costs the same number of queries for 2 or 8 collected cuotas", async () => {
    const { owner, group } = await seedGroup();

    const small = await loanWithCollected(group.id, owner.id, 2);
    const big = await loanWithCollected(group.id, owner.id, 8);

    const few = await recordQueries(() =>
      proposeVoidLoan(group.id, owner.id, small, true),
    );
    const many = await recordQueries(() =>
      proposeVoidLoan(group.id, owner.id, big, true),
    );

    console.log(
      "void loan queries: 2 cuotas =",
      few.sql.length,
      "| 8 cuotas =",
      many.sql.length,
    );

    expect(many.sql.length).toBeLessThanOrEqual(few.sql.length);
  }, 180_000);

  it("voiding a credit sale costs the same number of queries for 2 or 8 collected cuotas", async () => {
    const { owner, group } = await seedGroup();

    const sale = async (n: number) => {
      const created = await createCreditSale(group.id, owner.id, {
        buyer: { name: `Buyer ${n}` },
        item: `Item ${n}`,
        price: 1000 * n,
        cost: null,
        downPayment: 0,
        frequency: "monthly",
        startDate: TODAY,
        installments: Array.from({ length: n }, (_, i) => ({
          dueDate: `2027-${String((i % 9) + 1).padStart(2, "0")}-${String(10 + Math.floor(i / 9)).padStart(2, "0")}`,
          amount: 1000,
        })),
      });

      if (!created.ok) {
        throw new Error(`createCreditSale failed: ${created.error.kind}`);
      }

      await markAllCollected(
        group.id,
        owner.id,
        created.value.saleId,
        `sale-${n}`,
        "collect_sale",
        "credit_sale_installments",
        "sale_id",
        "collect_movement_id",
      );

      return created.value.saleId;
    };

    const small = await sale(2);
    const big = await sale(8);

    const few = await recordQueries(() =>
      proposeVoidCreditSale(group.id, owner.id, small, true),
    );
    const many = await recordQueries(() =>
      proposeVoidCreditSale(group.id, owner.id, big, true),
    );

    console.log(
      "void sale queries: 2 cuotas =",
      few.sql.length,
      "| 8 cuotas =",
      many.sql.length,
    );

    expect(many.sql.length).toBeLessThanOrEqual(few.sql.length);
  }, 180_000);
});

describe("D-rt: read paths (control, expected to pass)", () => {
  it("list use cases issue a constant number of queries as loans grow", async () => {
    const { owner, group } = await seedGroup();

    const reads = async () => {
      const counts: Record<string, number> = {};
      const measure = async (name: string, work: () => Promise<unknown>) => {
        counts[name] = (await recordQueries(work)).sql.length;
      };

      await measure("listLoans", () => listLoans(group.id, TODAY));
      await measure("listMovements", () => listMovements(group.id));
      await measure("listPendingChanges", () => listPendingChanges(group.id));
      await measure("listGroupInstallments", () =>
        listGroupInstallments(group.id),
      );
      await measure("listContacts", () => listContacts(group.id));
      await measure("listPlanChanges", () => listPlanChanges(group.id));
      await measure("listCreditSales", () => listCreditSales(group.id));
      await measure("getCapitalSummary", () =>
        useCases.getCapitalSummary.execute({ groupId: group.id }),
      );

      return counts;
    };

    await loanWithCollected(group.id, owner.id, 2);
    const before = await reads();

    await loanWithCollected(group.id, owner.id, 3);
    await loanWithCollected(group.id, owner.id, 4);
    await loanWithCollected(group.id, owner.id, 5);
    const after = await reads();

    console.log(
      "read query counts 1 loan vs 4 loans:",
      JSON.stringify({ before, after }),
    );

    expect(after).toEqual(before);
  }, 240_000);
});

describe("D-rt: the Panel page reads the ledger twice", () => {
  it("renders with one read of movements and one of installments", async () => {
    const { group } = await seedGroup();

    const { sql } = await recordQueries(() =>
      Promise.all([
        useCases.getPanel.execute({ groupId: group.id }),
        useCases.listPendingChanges.execute({ groupId: group.id }),
      ]),
    );

    const ledgerReads = sql.filter((text) => /from "movements"/.test(text));
    const installmentReads = sql.filter((text) =>
      /from "installments"/.test(text),
    );

    console.log(
      "panel queries:",
      sql.length,
      "| movements reads:",
      ledgerReads.length,
      "| installments reads:",
      installmentReads.length,
    );

    expect(ledgerReads.length).toBe(1);
    expect(installmentReads.length).toBe(1);
  }, 60_000);
});

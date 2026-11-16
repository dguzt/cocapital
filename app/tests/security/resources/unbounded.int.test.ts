/** Security audit D: lists that grow forever, and one request that writes unbounded rows. */

import {
  addMovement,
  createCreditSale,
  createGroup,
  createLoan,
  getCapitalSummary,
  listLoans,
  listMovements,
  listPlanChanges,
} from "@tests/support/use-cases";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import {
  CreditSalePlanChanges,
  Movements,
  Users,
} from "@/backend/infra/db/schema";
import { ManualMovement } from "@/backend/modules/movements/domain/manual-movement";
import { truncateAll } from "@/test/truncate";
import { seedGroup, TODAY } from "./seed";

beforeEach(truncateAll, 120_000);

const PAGE = 100;

describe("D-unb: reads return a page or a total, never every row", () => {
  it("listMovements is bounded by a page", async () => {
    const { owner, group } = await seedGroup();

    await db.insert(Movements).values(
      Array.from({ length: 600 }, (_, i) => ({
        groupId: group.id,
        userId: owner.id,
        type: "expense" as const,
        amount: 100 + i,
        date: TODAY,
      })),
    );

    const rows = await listMovements(group.id);

    console.log("listMovements returned", rows.length, "rows");

    expect(rows.length).toBeLessThanOrEqual(PAGE);
  }, 60_000);

  it("listPlanChanges is bounded by a page", async () => {
    const { owner, group } = await seedGroup();

    const sale = await createCreditSale(group.id, owner.id, {
      buyer: { name: "B" },
      item: "I",
      price: 1000,
      cost: null,
      downPayment: 0,
      frequency: "monthly",
      startDate: TODAY,
      installments: [{ dueDate: "2027-01-10", amount: 1000 }],
    });

    if (!sale.ok) {
      throw new Error("seed failed");
    }

    await db.insert(CreditSalePlanChanges).values(
      Array.from({ length: 600 }, () => ({
        saleId: sale.value.saleId,
        userId: owner.id,
        fromCount: 1,
        toCount: 1,
      })),
    );

    const rows = await listPlanChanges(group.id);

    console.log("listPlanChanges returned", rows.length, "rows");

    expect(rows.length).toBeLessThanOrEqual(PAGE);
  }, 60_000);

  it("the capital and the loans list add cuotas up instead of returning them", async () => {
    const { owner, group } = await seedGroup();

    for (let i = 0; i < 3; i++) {
      const created = await createLoan(group.id, owner.id, {
        borrower: { name: `B${i}` },
        capital: 3600,
        rateBps: 1000,
        frequency: "monthly",
        startDate: TODAY,
        installments: Array.from({ length: 360 }, (_, n) => ({
          number: n + 1,
          dueDate: "2027-01-10",
          amount: 11,
          principal: 10,
          interest: 1,
        })),
      });

      if (!created.ok) {
        throw new Error(`seed failed ${created.error.kind}`);
      }
    }

    const loans = await listLoans(group.id, TODAY);

    const capital = await getCapitalSummary(group.id);

    console.log("listLoans returned", loans.length, "rows for 1080 cuotas");

    expect(loans.length).toBeLessThanOrEqual(PAGE);
    expect(loans.map((loan) => loan.totalCount)).toEqual([360, 360, 360]);
    expect(capital.lent).toBe(3 * 3600);
  }, 120_000);
});

describe("D-abuse: one request can write unbounded rows or bytes", () => {
  it("createLoan rejects more cuotas than the 360 the schedule generator allows", async () => {
    const { owner, group } = await seedGroup();

    const count = 2000;

    const created = await createLoan(group.id, owner.id, {
      borrower: { name: "Spam" },
      capital: count,
      rateBps: 0,
      frequency: "monthly",
      startDate: TODAY,
      installments: Array.from({ length: count }, (_, n) => ({
        number: n + 1,
        dueDate: "2027-01-10",
        amount: 1,
        principal: 1,
        interest: 0,
      })),
    });

    console.log(
      "createLoan with",
      count,
      "cuotas ->",
      created.ok ? "ACCEPTED" : created.error.kind,
    );

    expect(created.ok).toBe(false);
  }, 60_000);

  it("createCreditSale rejects absurd cuota counts", async () => {
    const { owner, group } = await seedGroup();

    const count = 2000;

    const created = await createCreditSale(group.id, owner.id, {
      buyer: { name: "Spam" },
      item: "x",
      price: count,
      cost: null,
      downPayment: 0,
      frequency: "daily",
      startDate: TODAY,
      installments: Array.from({ length: count }, () => ({
        dueDate: "2027-01-10",
        amount: 1,
      })),
    });

    console.log(
      "createCreditSale with",
      count,
      "cuotas ->",
      created.ok ? "ACCEPTED" : created.error.kind,
    );

    expect(created.ok).toBe(false);
  }, 60_000);

  it("text fields have a length cap (concept, item, contact name)", async () => {
    const { owner, group } = await seedGroup();

    const big = "x".repeat(200_000);

    const movement = ManualMovement.parse({
      type: "expense",
      amountSoles: "1",
      concept: big,
      today: TODAY,
    });

    const stored = movement.ok
      ? await addMovement(group.id, owner.id, movement.value).then(() => true)
      : false;

    const loan = await createLoan(group.id, owner.id, {
      borrower: { name: big, phone: big },
      capital: 100,
      rateBps: 0,
      frequency: "monthly",
      startDate: TODAY,
      installments: [
        {
          number: 1,
          dueDate: "2027-01-10",
          amount: 100,
          principal: 100,
          interest: 0,
        },
      ],
    });

    const sale = await createCreditSale(group.id, owner.id, {
      buyer: { name: "ok" },
      item: big,
      price: 100,
      cost: null,
      downPayment: 0,
      frequency: "monthly",
      startDate: TODAY,
      installments: [{ dueDate: "2027-01-10", amount: 100 }],
    });

    console.log(
      "200k-char concept stored:",
      stored,
      "| 200k name+phone loan ok:",
      loan.ok,
      "| 200k item sale ok:",
      sale.ok,
    );

    expect([stored, loan.ok, sale.ok]).toEqual([false, false, false]);
  }, 60_000);

  it("a partner cannot found unlimited groups", async () => {
    const [user] = await db
      .insert(Users)
      .values({ clerkId: "clerk_spam", name: "Spam", email: "s@t.pe" })
      .returning();

    let created = 0;

    for (let i = 0; i < 25; i++) {
      const result = await createGroup(user, `Group ${i}`);

      if (result.ok) {
        created++;
      }
    }

    console.log("groups founded by one user:", created, "of 25 attempts");

    expect(created).toBeLessThan(25);
  }, 120_000);

  it("an amount past the integer column is a validation error, not a thrown DB error", async () => {
    const { owner, group } = await seedGroup();

    const movement = ManualMovement.parse({
      type: "expense",
      amountSoles: "99999999999",
      today: TODAY,
    });

    if (!movement.ok) {
      return;
    }

    const written = await addMovement(group.id, owner.id, movement.value).then(
      () => "stored",
      (error: Error) => `threw: ${error.message}`,
    );

    console.log("99999999999 soles ->", written);

    expect(written).toBe("stored");
  }, 60_000);
});

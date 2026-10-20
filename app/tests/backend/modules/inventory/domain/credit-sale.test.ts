import * as R from "remeda";
import { describe, expect, it } from "vitest";

import { CreditSale } from "@/backend/modules/inventory/domain/credit-sale";
import { CreditSalePlan } from "@/backend/modules/inventory/domain/credit-sale-plan";
import type { PlannedInstallment } from "@/backend/modules/inventory/domain/planned-installment";

const BUYER = { id: "c-juan", name: "Juan" };

function sale(input: {
  price: number;
  cost: number | null;
  downPayment?: number;
  installments: PlannedInstallment[];
}): CreditSale {
  const plan = CreditSalePlan.of({ downPayment: 0, ...input });

  if (!plan.ok) {
    throw new Error(plan.error.message);
  }

  return CreditSale.create({
    groupId: "g-1",
    userId: "u-1",
    buyer: BUYER,
    item: "  Licuadora  ",
    plan: plan.value,
    frequency: "monthly",
    startDate: "2026-10-18",
    saleMovementId: "m-sale",
  });
}

/** Collects a cuota the way the repository stores it. */
function collected(credit: CreditSale, installmentId: string): CreditSale {
  const collection = credit.collect(installmentId);

  if (!collection.ok) {
    throw new Error(collection.error.message);
  }

  return CreditSale.restore({
    ...credit,
    installments: credit.installments.map((installment) =>
      installment.id === installmentId
        ? {
            ...installment,
            status: "collected",
            costShare: collection.value.costShare,
            collectMovementId: `m-${installmentId}`,
          }
        : installment,
    ),
  });
}

const LICUADORA = {
  price: 10000,
  cost: 6000,
  downPayment: 2000,
  installments: [
    { dueDate: "2026-11-18", amount: 2666 },
    { dueDate: "2026-12-18", amount: 2666 },
    { dueDate: "2027-01-18", amount: 2668 },
  ],
};

describe("CreditSale.create", () => {
  it("makes the down payment cuota 0, due on the start date", () => {
    const credit = sale(LICUADORA);

    expect(credit.item).toBe("Licuadora");
    expect(
      credit.installments.map(({ number, dueDate, amount }) => ({
        number,
        dueDate,
        amount,
      })),
    ).toEqual([
      { number: 0, dueDate: "2026-10-18", amount: 2000 },
      { number: 1, dueDate: "2026-11-18", amount: 2666 },
      { number: 2, dueDate: "2026-12-18", amount: 2666 },
      { number: 3, dueDate: "2027-01-18", amount: 2668 },
    ]);
    expect(credit.pendingAmount()).toBe(10000);
    expect(credit.expectedMargin()).toBe(4000);
  });

  it("numbers from 1 when there is no down payment", () => {
    const credit = sale({
      ...LICUADORA,
      downPayment: 0,
      installments: [
        { dueDate: "2026-11-18", amount: 5000 },
        { dueDate: "2026-12-18", amount: 5000 },
      ],
    });

    expect(credit.installments.map((row) => row.number)).toEqual([1, 2]);
  });
});

describe("CreditSale.collect", () => {
  it("recovers cost in proportion cost/price", () => {
    const credit = sale(LICUADORA);

    const collection = credit.collect(credit.installments[0].id);

    expect(collection.ok && collection.value.costShare).toBe(1200);
  });

  it("the cuota that settles the sale takes the cost left, so it adds up exactly", () => {
    const odd = sale({
      price: 10000,
      cost: 3333,
      installments: [
        { dueDate: "2026-11-18", amount: 3333 },
        { dueDate: "2026-12-18", amount: 3333 },
        { dueDate: "2027-01-18", amount: 3334 },
      ],
    });

    const settled = R.reduce(
      [2, 0, 1],
      (credit, index) => collected(credit, odd.installments[index].id),
      odd,
    );

    expect(R.sumBy(settled.installments, (row) => row.costShare ?? 0)).toBe(
      3333,
    );
    expect(settled.isSettled()).toBe(true);
  });

  it("without a cost the whole cobro recovers cost and there is no margin", () => {
    const credit = sale({ ...LICUADORA, cost: null });

    const collection = credit.collect(credit.installments[1].id);

    expect(collection.ok && collection.value.costShare).toBe(2666);
    expect(credit.expectedMargin()).toBe(0);
  });

  it("refuses a cuota already collected", () => {
    const credit = sale(LICUADORA);

    const once = collected(credit, credit.installments[0].id);

    const twice = once.collect(credit.installments[0].id);

    expect(!twice.ok && twice.error.kind).toBe("InstallmentNotCollectable");
  });

  it("refuses any cobro on a voided sale", () => {
    const credit = CreditSale.restore({ ...sale(LICUADORA), status: "voided" });

    const result = credit.collect(credit.installments[0].id);

    expect(!result.ok && result.error.kind).toBe("CreditSaleVoided");
  });
});

describe("CreditSale.overdueCount", () => {
  it("counts pending cuotas due before today", () => {
    const fresh = sale(LICUADORA);

    const credit = collected(fresh, fresh.installments[0].id);

    expect(credit.overdueCount("2026-12-19")).toBe(2);
    expect(credit.overdueCount("2026-11-18")).toBe(0);
    expect(credit.overdueCount("2026-11-19")).toBe(1);
  });
});

describe("CreditSale.replan", () => {
  it("stretches what is pending into more cuotas numbered after the collected ones", () => {
    const credit = sale(LICUADORA);

    const paid = collected(
      collected(credit, credit.installments[0].id),
      credit.installments[1].id,
    );

    const result = paid.replan([
      { dueDate: "2027-01-01", amount: 1333 },
      { dueDate: "2027-02-01", amount: 1333 },
      { dueDate: "2027-03-01", amount: 1333 },
      { dueDate: "2027-04-01", amount: 1335 },
    ]);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.fromCount).toBe(2);
    expect(result.value.toCount).toBe(4);
    expect(result.value.installments.map((row) => row.number)).toEqual([
      2, 3, 4, 5,
    ]);
  });

  it("refuses cuotas that do not add up to what is pending", () => {
    const credit = sale(LICUADORA);

    const result = credit.replan([{ dueDate: "2027-01-01", amount: 9999 }]);

    expect(!result.ok && result.error).toMatchObject({
      kind: "ScheduleMismatch",
      scheduled: 9999,
      expected: 10000,
    });
  });
});

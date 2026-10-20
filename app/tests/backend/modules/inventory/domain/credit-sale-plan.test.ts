import { describe, expect, it } from "vitest";

import { CreditSalePlan } from "@/backend/modules/inventory/domain/credit-sale-plan";

const CUOTAS = [
  { dueDate: "2026-11-01", amount: 4000 },
  { dueDate: "2026-12-01", amount: 4000 },
];

describe("CreditSalePlan.of", () => {
  it("accepts a down payment plus cuotas that add up to the price", () => {
    const result = CreditSalePlan.of({
      price: 10000,
      cost: 6000,
      downPayment: 2000,
      installments: CUOTAS,
    });

    expect(result.ok).toBe(true);
  });

  it("refuses cuotas that do not add up, naming both sums", () => {
    const result = CreditSalePlan.of({
      price: 10000,
      cost: null,
      downPayment: 2000,
      installments: [CUOTAS[0], { ...CUOTAS[1], amount: 4333 }],
    });

    expect(!result.ok && result.error).toMatchObject({
      kind: "ScheduleMismatch",
      scheduled: 10333,
      expected: 10000,
    });
  });

  it.each([
    [{ price: 0 }, "InvalidPrice"],
    [{ cost: -1 }, "InvalidCost"],
    [{ downPayment: 10000 }, "InvalidDownPayment"],
    [{ installments: [] }, "InvalidInstallments"],
    [
      { installments: [{ dueDate: "2026-11-01", amount: 0 }] },
      "InvalidInstallments",
    ],
  ])("refuses %o with %s", (patch, kind) => {
    const result = CreditSalePlan.of({
      price: 10000,
      cost: 6000,
      downPayment: 2000,
      installments: CUOTAS,
      ...patch,
    });

    expect(!result.ok && result.error.kind).toBe(kind);
  });
});

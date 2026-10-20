import { describe, expect, it } from "vitest";

import { CreditSaleSchedule } from "@/backend/modules/inventory/domain/credit-sale-schedule";

describe("CreditSaleSchedule.generate", () => {
  it("splits evenly, one period apart, the last cuota absorbing the cents", () => {
    const result = CreditSaleSchedule.generate({
      amount: 8000,
      installmentCount: 3,
      frequency: "monthly",
      startDate: "2026-10-01",
    });

    expect(result.ok && result.value).toEqual([
      { dueDate: "2026-11-01", amount: 2666 },
      { dueDate: "2026-12-01", amount: 2666 },
      { dueDate: "2027-01-01", amount: 2668 },
    ]);
  });

  it("refuses a count outside 1..360", () => {
    const result = CreditSaleSchedule.generate({
      amount: 8000,
      installmentCount: 0,
      frequency: "weekly",
      startDate: "2026-10-01",
    });

    expect(!result.ok && result.error.kind).toBe("InvalidInstallmentCount");
  });

  it("refuses a bad start date", () => {
    const result = CreditSaleSchedule.generate({
      amount: 8000,
      installmentCount: 2,
      frequency: "weekly",
      startDate: "2026-13-45",
    });

    expect(!result.ok && result.error.kind).toBe("InvalidStartDate");
  });
});

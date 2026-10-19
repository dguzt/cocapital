import { describe, expect, it } from "vitest";
import type { CapitalInstallment } from "@/backend/modules/capital/domain/capital-installment";
import type { CapitalMovement } from "@/backend/modules/capital/domain/capital-movement";
import { CapitalSummary } from "@/backend/modules/capital/domain/capital-summary";
import type { MovementType } from "@/backend/modules/movements/domain/movement";

const mv = (
  type: MovementType,
  amount: number,
  extra: Partial<CapitalMovement> = {},
): CapitalMovement => ({
  type,
  amount,
  cost: null,
  status: "active",
  ...extra,
});

const inst = (
  principal: number,
  interest: number,
  status: CapitalInstallment["status"],
): CapitalInstallment => ({ principal, interest, status });

describe("CapitalSummary.derive — movement effects", () => {
  it("empty ledger = all zeros", () => {
    expect(CapitalSummary.derive([], [])).toEqual({
      total: 0,
      cash: 0,
      inventory: 0,
      lent: 0,
      salesProfit: 0,
      collectedInterest: 0,
      expectedInterest: 0,
    });
  });
  it("salesProfit accumulates margin only from costed sells", () => {
    const s = CapitalSummary.derive(
      [
        mv("sell_inventory", 12000, { cost: 9000 }), // +30 margin
        mv("sell_inventory", 5000), // no cost → 0 margin
        mv("sell_inventory", 8000, { cost: 10000 }), // sold at a loss: −20
      ],
      [],
    );
    expect(s.salesProfit).toBe(1000); // 3000 + 0 − 2000
  });
  it("contribute adds cash; expense removes it", () => {
    const s = CapitalSummary.derive(
      [mv("contribute", 50000), mv("expense", 1000)],
      [],
    );
    expect(s.cash).toBe(49000);
    expect(s.total).toBe(49000);
  });
  it("buy moves cash → inventory (total unchanged)", () => {
    const s = CapitalSummary.derive(
      [mv("contribute", 50000), mv("buy_inventory", 20000)],
      [],
    );
    expect(s.cash).toBe(30000);
    expect(s.inventory).toBe(20000);
    expect(s.total).toBe(50000);
  });
  it("sell with cost realizes the margin into total", () => {
    // bought at 100, sold at 120 → total grows by 20
    const s = CapitalSummary.derive(
      [
        mv("contribute", 10000),
        mv("buy_inventory", 10000),
        mv("sell_inventory", 12000, { cost: 10000 }),
      ],
      [],
    );
    expect(s.cash).toBe(12000);
    expect(s.inventory).toBe(0);
    expect(s.total).toBe(12000);
  });
  it("sell without cost = zero margin (cost defaults to amount)", () => {
    const s = CapitalSummary.derive(
      [
        mv("contribute", 10000),
        mv("buy_inventory", 10000),
        mv("sell_inventory", 12000),
      ],
      [],
    );
    expect(s.cash).toBe(12000);
    expect(s.inventory).toBe(-2000); // visible drift, never silent
    expect(s.total).toBe(10000);
  });
  it("voided movements are excluded everywhere", () => {
    const s = CapitalSummary.derive(
      [mv("contribute", 50000), mv("expense", 99999, { status: "voided" })],
      [],
    );
    expect(s.total).toBe(50000);
  });
});

describe("CapitalSummary.derive — lending (interest counts only once collected)", () => {
  // Karina's seed loan: S/300 @ 10% × 4 → installments of 82.50 (75 + 7.50)
  const lentLedger = [mv("contribute", 50000), mv("lend", 30000)];
  const freshLoan = [
    inst(7500, 750, "pending"),
    inst(7500, 750, "pending"),
    inst(7500, 750, "pending"),
    inst(7500, 750, "pending"),
  ];

  it("creating a loan moves principal cash → lent; total unchanged", () => {
    const s = CapitalSummary.derive(lentLedger, freshLoan);
    expect(s.cash).toBe(20000);
    expect(s.lent).toBe(30000);
    expect(s.total).toBe(50000); // no expected interest in total
    expect(s.expectedInterest).toBe(3000);
    expect(s.collectedInterest).toBe(0);
  });

  it("collecting: cash + installment, lent − principal, interest realized", () => {
    const afterCollect = [...lentLedger, mv("repay", 8250)];
    const oneCollected = [
      inst(7500, 750, "collected"),
      inst(7500, 750, "pending"),
      inst(7500, 750, "pending"),
      inst(7500, 750, "pending"),
    ];
    const s = CapitalSummary.derive(afterCollect, oneCollected);
    expect(s.cash).toBe(28250);
    expect(s.lent).toBe(22500);
    expect(s.collectedInterest).toBe(750);
    expect(s.expectedInterest).toBe(2250);
    // Total grew by exactly the collected interest: 50000 + 750.
    expect(s.total).toBe(50750);
  });

  it("fully collected loan: total = original + all interest", () => {
    const ledger = [
      ...lentLedger,
      mv("repay", 8250),
      mv("repay", 8250),
      mv("repay", 8250),
      mv("repay", 8250),
    ];
    const done = freshLoan.map((i) => ({
      ...i,
      status: "collected" as const,
    }));
    const s = CapitalSummary.derive(ledger, done);
    expect(s.lent).toBe(0);
    expect(s.collectedInterest).toBe(3000);
    expect(s.total).toBe(53000);
  });

  it("is deterministic over the same ledger", () => {
    const a = CapitalSummary.derive(lentLedger, freshLoan);
    const b = CapitalSummary.derive([...lentLedger], [...freshLoan]);
    expect(a).toEqual(b);
  });
});

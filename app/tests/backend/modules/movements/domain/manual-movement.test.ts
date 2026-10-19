import { describe, expect, it } from "vitest";
import { ManualMovement } from "@/backend/modules/movements/domain/manual-movement";

const base = {
  type: "contribute",
  amountSoles: "500",
  today: "2026-07-09",
};

describe("ManualMovement.parse", () => {
  it("accepts a plain contribute", () => {
    const r = ManualMovement.parse(base);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        type: "contribute",
        amount: 50000,
        cost: null,
        concept: null,
        date: "2026-07-09",
      });
    }
  });
  it("keeps decimal soles exact (S/36.66 → 3666)", () => {
    const r = ManualMovement.parse({ ...base, amountSoles: "36.66" });
    expect(r.ok && r.value.amount === 3666).toBe(true);
  });
  it("trims concept; empty concept becomes null (A-3 optional)", () => {
    const r = ManualMovement.parse({ ...base, concept: "  feria  " });
    expect(r.ok && r.value.concept === "feria").toBe(true);
    const r2 = ManualMovement.parse({ ...base, concept: "   " });
    expect(r2.ok && r2.value.concept === null).toBe(true);
  });
  it("sell with cost keeps it; cost on other types is ignored", () => {
    const sell = ManualMovement.parse({
      ...base,
      type: "sell_inventory",
      amountSoles: "120",
      costSoles: "90",
    });
    expect(sell.ok && sell.value.cost === 9000).toBe(true);
    const buy = ManualMovement.parse({
      ...base,
      type: "buy_inventory",
      costSoles: "90",
    });
    expect(buy.ok && buy.value.cost === null).toBe(true);
  });
  it("sell with blank cost = zero-margin sell (cost null)", () => {
    const r = ManualMovement.parse({
      ...base,
      type: "sell_inventory",
      costSoles: "  ",
    });
    expect(r.ok && r.value.cost === null).toBe(true);
  });
  it("rejects lend/repay (loans write them) and unknown types", () => {
    for (const type of ["lend", "repay", "steal"]) {
      const r = ManualMovement.parse({ ...base, type });
      expect(!r.ok && r.error.kind === "InvalidType").toBe(true);
    }
  });
  it.each(["0", "-5", "abc", ""])("rejects amount %j", (amountSoles) => {
    const r = ManualMovement.parse({ ...base, amountSoles });
    expect(!r.ok && r.error.kind === "InvalidAmount").toBe(true);
  });
  it("rejects a garbage cost on sells", () => {
    const r = ManualMovement.parse({
      ...base,
      type: "sell_inventory",
      costSoles: "abc",
    });
    expect(!r.ok && r.error.kind === "InvalidCost").toBe(true);
  });
});

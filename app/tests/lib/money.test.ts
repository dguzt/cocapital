import { describe, expect, it } from "vitest";
import {
  formatCents,
  sanitizeIntInput,
  sanitizeMoneyInput,
  solesToCents,
  splitEvenly,
} from "@/lib/money";

describe("solesToCents", () => {
  it("parses plain amounts", () => {
    expect(solesToCents("36.66")).toBe(3666);
    expect(solesToCents("300")).toBe(30000);
    expect(solesToCents(82.5)).toBe(8250);
  });
  it("parses thousands separators", () => {
    expect(solesToCents("1,234.56")).toBe(123456);
  });
  it("survives float dust (36.66 * 100 = 3665.999…)", () => {
    expect(solesToCents(36.66)).toBe(3666);
  });
  it("rejects garbage and negatives", () => {
    expect(solesToCents("abc")).toBeNull();
    expect(solesToCents("-5")).toBeNull();
    expect(solesToCents(Number.NaN)).toBeNull();
  });
});

describe("formatCents", () => {
  it("formats with thousands separators", () => {
    expect(formatCents(3666)).toBe("S/ 36.66");
    expect(formatCents(123456)).toBe("S/ 1,234.56");
    expect(formatCents(100000000)).toBe("S/ 1,000,000.00");
  });
  it("pads cents", () => {
    expect(formatCents(30000)).toBe("S/ 300.00");
    expect(formatCents(5)).toBe("S/ 0.05");
    expect(formatCents(0)).toBe("S/ 0.00");
  });
  it("handles negatives (deltas in edit history)", () => {
    expect(formatCents(-4500)).toBe("-S/ 45.00");
  });
});

describe("splitEvenly (last absorbs)", () => {
  it("splits exactly when divisible: S/330 × 4", () => {
    expect(splitEvenly(33000, 4)).toEqual([8250, 8250, 8250, 8250]);
  });
  it("gives the remainder to the LAST part: S/110 × 3", () => {
    expect(splitEvenly(11000, 3)).toEqual([3666, 3666, 3668]);
  });
  it("single part gets everything", () => {
    expect(splitEvenly(11000, 1)).toEqual([11000]);
  });
  it("sum always equals total (invariant)", () => {
    for (const [total, parts] of [
      [11000, 3],
      [10001, 7],
      [99, 100],
      [1, 2],
    ] as const) {
      const r = splitEvenly(total, parts);
      expect(r).toHaveLength(parts);
      expect(r.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });
  it("rejects non-integer or invalid input", () => {
    expect(() => splitEvenly(10.5, 2)).toThrow();
    expect(() => splitEvenly(-1, 2)).toThrow();
    expect(() => splitEvenly(100, 0)).toThrow();
  });
});

describe("sanitizeMoneyInput (field-level guard)", () => {
  it("strips letters and symbols", () => {
    expect(sanitizeMoneyInput("12a3")).toBe("123");
    expect(sanitizeMoneyInput("S/ 50")).toBe("50");
    expect(sanitizeMoneyInput("hello")).toBe("");
  });
  it("allows a single decimal point, max 2 decimals", () => {
    expect(sanitizeMoneyInput("36.66")).toBe("36.66");
    expect(sanitizeMoneyInput("36.667")).toBe("36.66");
    expect(sanitizeMoneyInput("3.6.6")).toBe("3.66");
    expect(sanitizeMoneyInput("36.")).toBe("36.");
  });
  it("keeps partial typing usable", () => {
    expect(sanitizeMoneyInput("")).toBe("");
    expect(sanitizeMoneyInput(".5")).toBe(".5");
  });
});

describe("sanitizeIntInput", () => {
  it("digits only", () => {
    expect(sanitizeIntInput("4a")).toBe("4");
    expect(sanitizeIntInput("1.5")).toBe("15");
    expect(sanitizeIntInput("abc")).toBe("");
  });
});

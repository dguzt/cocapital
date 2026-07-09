import { describe, expect, it } from "vitest";
import { formatCentimos, solesToCentimos, splitEvenly } from "./money";

describe("solesToCentimos", () => {
  it("parses plain amounts", () => {
    expect(solesToCentimos("36.66")).toBe(3666);
    expect(solesToCentimos("300")).toBe(30000);
    expect(solesToCentimos(82.5)).toBe(8250);
  });
  it("parses thousands separators", () => {
    expect(solesToCentimos("1,234.56")).toBe(123456);
  });
  it("survives float dust (36.66 * 100 = 3665.999…)", () => {
    expect(solesToCentimos(36.66)).toBe(3666);
  });
  it("rejects garbage and negatives", () => {
    expect(solesToCentimos("abc")).toBeNull();
    expect(solesToCentimos("-5")).toBeNull();
    expect(solesToCentimos(Number.NaN)).toBeNull();
  });
});

describe("formatCentimos", () => {
  it("formats with thousands separators", () => {
    expect(formatCentimos(3666)).toBe("S/ 36.66");
    expect(formatCentimos(123456)).toBe("S/ 1,234.56");
    expect(formatCentimos(100000000)).toBe("S/ 1,000,000.00");
  });
  it("pads céntimos", () => {
    expect(formatCentimos(30000)).toBe("S/ 300.00");
    expect(formatCentimos(5)).toBe("S/ 0.05");
    expect(formatCentimos(0)).toBe("S/ 0.00");
  });
  it("handles negatives (deltas in edit history)", () => {
    expect(formatCentimos(-4500)).toBe("-S/ 45.00");
  });
});

describe("splitEvenly (D5: last absorbs)", () => {
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

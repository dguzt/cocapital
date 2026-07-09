import { describe, expect, it } from "vitest";
import { addPeriods, isVencida, todayInLima } from "./dates";

describe("addPeriods", () => {
  it("diario steps one day", () => {
    expect(addPeriods("2026-07-09", "diario", 1)).toBe("2026-07-10");
    expect(addPeriods("2026-07-31", "diario", 1)).toBe("2026-08-01");
  });
  it("semanal steps 7 days", () => {
    expect(addPeriods("2026-07-09", "semanal", 1)).toBe("2026-07-16");
    expect(addPeriods("2026-07-09", "semanal", 4)).toBe("2026-08-06");
  });
  it("quincenal steps 15 days", () => {
    expect(addPeriods("2026-01-01", "quincenal", 1)).toBe("2026-01-16");
    expect(addPeriods("2026-01-01", "quincenal", 2)).toBe("2026-01-31");
  });
  it("mensual keeps the day when it fits", () => {
    expect(addPeriods("2026-07-15", "mensual", 1)).toBe("2026-08-15");
    expect(addPeriods("2026-07-15", "mensual", 6)).toBe("2027-01-15");
  });
  it("mensual clamps to month-end (A-2)", () => {
    expect(addPeriods("2026-01-31", "mensual", 1)).toBe("2026-02-28");
    expect(addPeriods("2026-01-30", "mensual", 1)).toBe("2026-02-28");
  });
  it("mensual clamps to Feb 29 on leap years", () => {
    expect(addPeriods("2028-01-31", "mensual", 1)).toBe("2028-02-29");
  });
  it("mensual preserves the anchor day past a short month", () => {
    // Ene 31 → Feb 28 → Mar 31: anchored to 31, not to the clamped 28.
    expect(addPeriods("2026-01-31", "mensual", 2)).toBe("2026-03-31");
  });
  it("mensual crosses year boundaries", () => {
    expect(addPeriods("2026-11-30", "mensual", 3)).toBe("2027-02-28");
  });
});

describe("isVencida (derived, D3 #10)", () => {
  it("strictly before today is vencida", () => {
    expect(isVencida("2026-07-08", "2026-07-09")).toBe(true);
  });
  it("due today is NOT vencida", () => {
    expect(isVencida("2026-07-09", "2026-07-09")).toBe(false);
  });
  it("future is not vencida", () => {
    expect(isVencida("2026-07-10", "2026-07-09")).toBe(false);
  });
});

describe("todayInLima", () => {
  it("returns YYYY-MM-DD", () => {
    expect(todayInLima()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

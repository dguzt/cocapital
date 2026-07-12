import { describe, expect, it } from "vitest";
import { addPeriods, isOverdue, todayInLima } from "@/lib/dates";

describe("addPeriods", () => {
  it("daily steps one day", () => {
    expect(addPeriods("2026-07-09", "daily", 1)).toBe("2026-07-10");
    expect(addPeriods("2026-07-31", "daily", 1)).toBe("2026-08-01");
  });
  it("weekly steps 7 days", () => {
    expect(addPeriods("2026-07-09", "weekly", 1)).toBe("2026-07-16");
    expect(addPeriods("2026-07-09", "weekly", 4)).toBe("2026-08-06");
  });
  it("biweekly (quincenal) steps 15 days", () => {
    expect(addPeriods("2026-01-01", "biweekly", 1)).toBe("2026-01-16");
    expect(addPeriods("2026-01-01", "biweekly", 2)).toBe("2026-01-31");
  });
  it("monthly keeps the day when it fits", () => {
    expect(addPeriods("2026-07-15", "monthly", 1)).toBe("2026-08-15");
    expect(addPeriods("2026-07-15", "monthly", 6)).toBe("2027-01-15");
  });
  it("monthly clamps to month-end (A-2)", () => {
    expect(addPeriods("2026-01-31", "monthly", 1)).toBe("2026-02-28");
    expect(addPeriods("2026-01-30", "monthly", 1)).toBe("2026-02-28");
  });
  it("monthly clamps to Feb 29 on leap years", () => {
    expect(addPeriods("2028-01-31", "monthly", 1)).toBe("2028-02-29");
  });
  it("monthly preserves the anchor day past a short month", () => {
    // Jan 31 → Feb 28 → Mar 31: anchored to 31, not to the clamped 28.
    expect(addPeriods("2026-01-31", "monthly", 2)).toBe("2026-03-31");
  });
  it("monthly crosses year boundaries", () => {
    expect(addPeriods("2026-11-30", "monthly", 3)).toBe("2027-02-28");
  });
});

describe("isOverdue (vencida — derived, D3 #10)", () => {
  it("strictly before today is overdue", () => {
    expect(isOverdue("2026-07-08", "2026-07-09")).toBe(true);
  });
  it("due today is NOT overdue", () => {
    expect(isOverdue("2026-07-09", "2026-07-09")).toBe(false);
  });
  it("future is not overdue", () => {
    expect(isOverdue("2026-07-10", "2026-07-09")).toBe(false);
  });
});

describe("todayInLima", () => {
  it("returns YYYY-MM-DD", () => {
    expect(todayInLima()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

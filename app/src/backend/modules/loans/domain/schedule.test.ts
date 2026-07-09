import { describe, expect, it } from "vitest";
import type { Schedule } from "./schedule";
import { generateSchedule, type ScheduleInput } from "./schedule";

const base: ScheduleInput = {
  capital: 30000, // S/300
  ratePercent: 10,
  nCuotas: 4,
  frequency: "mensual",
  startDate: "2026-07-09",
};

function unwrap(input: ScheduleInput): Schedule {
  const r = generateSchedule(input);
  if (!r.ok) throw new Error(`expected ok, got ${r.error.kind}`);
  return r.value;
}

/** The D5 invariants — every valid schedule must satisfy all four. */
function assertInvariants(s: Schedule, capital: number) {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  expect(sum(s.installments.map((i) => i.amount))).toBe(s.total);
  expect(sum(s.installments.map((i) => i.principal))).toBe(capital);
  expect(sum(s.installments.map((i) => i.interest))).toBe(s.interest);
  for (const i of s.installments) {
    expect(i.principal + i.interest).toBe(i.amount);
  }
}

describe("generateSchedule — golden: S/300 @ 10% × 4 mensual (D3 seed)", () => {
  const s = unwrap(base);
  it("totals: S/330, interés S/30", () => {
    expect(s.total).toBe(33000);
    expect(s.interest).toBe(3000);
  });
  it("4 equal cuotas of S/82.50 = S/75.00 capital + S/7.50 interés", () => {
    expect(s.installments).toHaveLength(4);
    for (const i of s.installments) {
      expect(i.amount).toBe(8250);
      expect(i.principal).toBe(7500);
      expect(i.interest).toBe(750);
    }
  });
  it("first cuota = start + 1 period; monthly cadence", () => {
    expect(s.installments.map((i) => i.dueDate)).toEqual([
      "2026-08-09",
      "2026-09-09",
      "2026-10-09",
      "2026-11-09",
    ]);
  });
  it("holds all invariants", () => assertInvariants(s, 30000));
});

describe("generateSchedule — remainder céntimo (S/100 @ 10% × 3)", () => {
  const s = unwrap({ ...base, capital: 10000, nCuotas: 3 });
  it("last cuota absorbs (D5)", () => {
    expect(s.installments.map((i) => i.amount)).toEqual([3666, 3666, 3668]);
    expect(s.installments.map((i) => i.principal)).toEqual([3333, 3333, 3334]);
    expect(s.installments.map((i) => i.interest)).toEqual([333, 333, 334]);
  });
  it("holds all invariants", () => assertInvariants(s, 10000));
});

describe("generateSchedule — edges", () => {
  it("single cuota gets everything", () => {
    const s = unwrap({ ...base, nCuotas: 1 });
    expect(s.installments).toHaveLength(1);
    expect(s.installments[0].amount).toBe(33000);
    assertInvariants(s, 30000);
  });
  it("0% interest: cuotas = capital split, interés 0", () => {
    const s = unwrap({ ...base, ratePercent: 0 });
    expect(s.interest).toBe(0);
    expect(s.installments.every((i) => i.interest === 0)).toBe(true);
    assertInvariants(s, 30000);
  });
  it("decimal rate: S/300 @ 10.5% → interés S/31.50", () => {
    const s = unwrap({ ...base, ratePercent: 10.5 });
    expect(s.interest).toBe(3150);
    assertInvariants(s, 30000);
  });
  it("semanal / quincenal / diario cadences step correctly", () => {
    expect(
      unwrap({ ...base, frequency: "semanal", nCuotas: 2 }).installments.map(
        (i) => i.dueDate,
      ),
    ).toEqual(["2026-07-16", "2026-07-23"]);
    expect(
      unwrap({ ...base, frequency: "quincenal", nCuotas: 2 }).installments.map(
        (i) => i.dueDate,
      ),
    ).toEqual(["2026-07-24", "2026-08-08"]);
    expect(
      unwrap({ ...base, frequency: "diario", nCuotas: 2 }).installments.map(
        (i) => i.dueDate,
      ),
    ).toEqual(["2026-07-10", "2026-07-11"]);
  });
  it("mensual from Ene 31 clamps but keeps the anchor", () => {
    const s = unwrap({
      ...base,
      startDate: "2026-01-31",
      nCuotas: 3,
    });
    expect(s.installments.map((i) => i.dueDate)).toEqual([
      "2026-02-28",
      "2026-03-31",
      "2026-04-30",
    ]);
  });
  it("dates strictly increase for every frequency", () => {
    for (const frequency of [
      "diario",
      "semanal",
      "quincenal",
      "mensual",
    ] as const) {
      const s = unwrap({ ...base, frequency, nCuotas: 12 });
      const dates = s.installments.map((i) => i.dueDate);
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i] > dates[i - 1]).toBe(true);
      }
    }
  });
});

describe("generateSchedule — rejects bad input with typed errors", () => {
  it.each([
    [{ ...base, capital: 0 }, "InvalidCapital"],
    [{ ...base, capital: -100 }, "InvalidCapital"],
    [{ ...base, capital: 100.5 }, "InvalidCapital"],
    [{ ...base, ratePercent: -1 }, "InvalidRate"],
    [{ ...base, ratePercent: Number.NaN }, "InvalidRate"],
    [{ ...base, nCuotas: 0 }, "InvalidCuotas"],
    [{ ...base, nCuotas: 2.5 }, "InvalidCuotas"],
    [{ ...base, nCuotas: 999 }, "InvalidCuotas"],
    [{ ...base, startDate: "31/01/2026" }, "InvalidStartDate"],
    [{ ...base, startDate: "" }, "InvalidStartDate"],
  ] as const)("%o → %s", (input, kind) => {
    const r = generateSchedule(input as ScheduleInput);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe(kind);
  });
});

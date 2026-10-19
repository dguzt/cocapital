/** The money rules of a schedule. */
import { describe, expect, it } from "vitest";
import { checkSchedule } from "@/backend/modules/loans/domain/invariants";
import type { NewLoanInstallment } from "@/backend/modules/loans/domain/loan";

/** S/40 at 10% → 2 cuotas of S/22: principal 2000 + interest 200 each. */
const valid: NewLoanInstallment[] = [
  {
    number: 1,
    dueDate: "2026-07-16",
    amount: 2200,
    principal: 2000,
    interest: 200,
  },
  {
    number: 2,
    dueDate: "2026-07-23",
    amount: 2200,
    principal: 2000,
    interest: 200,
  },
];

/** Which invariant broke — null if the schedule was accepted. */
function reasonOf(result: ReturnType<typeof checkSchedule>) {
  if (result.ok) return null;
  return result.error.kind === "InvalidInstallments"
    ? result.error.reason
    : result.error.kind;
}

describe("checkSchedule", () => {
  it("accepts a schedule whose principal sums to the capital", () => {
    expect(checkSchedule(valid, 4000).ok).toBe(true);
  });

  it("rejects an empty schedule", () => {
    expect(reasonOf(checkSchedule([], 4000))).toBe("empty");
  });

  it("rejects principal that does not sum to the capital", () => {
    // One cent short — the loan would lend money it never accounted for.
    const short = valid.map((i, idx) =>
      idx === 0 ? { ...i, principal: i.principal - 1 } : i,
    );
    expect(reasonOf(checkSchedule(short, 4000))).toBe("principal-mismatch");
  });

  it("rejects a row where principal + interest is not the amount", () => {
    const broken = valid.map((i, idx) =>
      idx === 1 ? { ...i, interest: i.interest + 5 } : i,
    );
    expect(reasonOf(checkSchedule(broken, 4000))).toBe("row-invariant");
  });

  it("rejects a cuota of zero", () => {
    const zero = valid.map((i, idx) =>
      idx === 0 ? { ...i, amount: 0, principal: 0, interest: 0 } : i,
    );
    expect(reasonOf(checkSchedule(zero, 2000))).toBe("row-invariant");
  });
});

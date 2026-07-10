import { describe, expect, it } from "vitest";
import { MAX_CENTS, MAX_RATE_BPS, validateLoanValues } from "./validate";

/** A well-formed loan: S/300 @ 10%, one installment for brevity. */
const valid = {
  capital: 30000,
  rateBps: 1000,
  startDate: "2026-07-09",
  installments: [
    {
      number: 1,
      dueDate: "2026-08-09",
      amount: 33000,
      principal: 30000,
      interest: 3000,
    },
  ],
};

describe("validateLoanValues — accepts legitimate input", () => {
  it("passes a well-formed loan", () => {
    expect(validateLoanValues(valid).ok).toBe(true);
  });
});

describe("validateLoanValues — blocks the C1 phantom-profit exploit", () => {
  it("rejects the exact negative-capital / negative-principal payload", () => {
    // This payload passes every ARITHMETIC check (amount>0,
    // principal+interest=amount, Σprincipal=capital) yet mints phantom cash.
    const exploit = {
      capital: -1000000,
      rateBps: 0,
      startDate: "2026-07-09",
      installments: [
        {
          number: 1,
          dueDate: "2026-08-09",
          amount: 1,
          principal: -1000000,
          interest: 1000001,
        },
      ],
    };
    const r = validateLoanValues(exploit);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("InvalidCapital");
  });

  it("rejects a negative principal even when capital is positive", () => {
    const r = validateLoanValues({
      ...valid,
      capital: 1,
      installments: [
        { number: 1, dueDate: "2026-08-09", amount: 1, principal: -50, interest: 51 },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("InvalidInstallmentValue");
  });
});

describe("validateLoanValues — sign, bounds, and format guards", () => {
  it("rejects zero capital", () => {
    expect(validateLoanValues({ ...valid, capital: 0 }).ok).toBe(false);
  });
  it("rejects capital over the cents ceiling", () => {
    expect(validateLoanValues({ ...valid, capital: MAX_CENTS + 1 }).ok).toBe(false);
  });
  it("rejects a negative rate", () => {
    expect(validateLoanValues({ ...valid, rateBps: -1 }).ok).toBe(false);
  });
  it("rejects an absurd rate", () => {
    expect(validateLoanValues({ ...valid, rateBps: MAX_RATE_BPS + 1 }).ok).toBe(
      false,
    );
  });
  it("rejects a non-integer amount", () => {
    const r = validateLoanValues({
      ...valid,
      installments: [{ ...valid.installments[0], amount: 100.5 }],
    });
    expect(r.ok).toBe(false);
  });
  it("rejects a malformed start date", () => {
    const r = validateLoanValues({ ...valid, startDate: "not-a-date" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("InvalidLoanDate");
  });
  it("rejects a malformed due date", () => {
    const r = validateLoanValues({
      ...valid,
      installments: [{ ...valid.installments[0], dueDate: "2026-13-40" }],
    });
    expect(r.ok).toBe(false);
  });
  it("rejects duplicate installment numbers", () => {
    const r = validateLoanValues({
      ...valid,
      installments: [valid.installments[0], valid.installments[0]],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("InvalidInstallmentValue");
  });
  it("rejects an empty schedule", () => {
    expect(validateLoanValues({ ...valid, installments: [] }).ok).toBe(false);
  });
});

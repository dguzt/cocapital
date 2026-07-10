/**
 * Server-side value validation for loan creation (security fix C1).
 *
 * A `"use server"` action is a public POST endpoint and TypeScript types are
 * erased at runtime, so a caller can bypass the wizard and send any JSON.
 * `createLoan` only checked *arithmetic consistency* (Σprincipal = capital,
 * principal+interest = amount), which a negative-capital / negative-principal
 * payload satisfies — minting phantom cash and profit in the shared ledger.
 * This pure validator enforces sign, bounds, and format BEFORE any write.
 */
import type { AppError } from "@/lib/result";
import { err, ok, type Result } from "@/lib/result";

export type LoanValidationError =
  | AppError<"InvalidCapital", { capital: number }>
  | AppError<"InvalidRate", { rateBps: number }>
  | AppError<"InvalidInstallmentValue", { reason: string }>
  | AppError<"InvalidLoanDate", { date: string }>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_INSTALLMENTS = 360;
/** ~ S/ 20,000,000 in cents — safely under Postgres int4 max (2,147,483,647). */
export const MAX_CENTS = 2_000_000_000;
/** 1,000,000 bps = 10,000% total — generous for informal lending, still bounded. */
export const MAX_RATE_BPS = 1_000_000;

type InstallmentValues = {
  number: number;
  dueDate: string;
  amount: number;
  principal: number;
  interest: number;
};

const isCents = (n: number): boolean =>
  Number.isInteger(n) && n >= 0 && n <= MAX_CENTS;

const isValidISODate = (d: string): boolean =>
  ISO_DATE.test(d) && !Number.isNaN(Date.parse(d));

/** Reject any value a legitimate wizard flow could never produce. */
export function validateLoanValues(input: {
  capital: number;
  rateBps: number;
  startDate: string;
  installments: InstallmentValues[];
}): Result<void, LoanValidationError> {
  const { capital, rateBps, startDate, installments } = input;

  if (!Number.isInteger(capital) || capital <= 0 || capital > MAX_CENTS) {
    return err({
      kind: "InvalidCapital",
      message: `capital must be a positive integer in cents up to ${MAX_CENTS}, got ${capital}`,
      capital,
    });
  }
  if (!Number.isInteger(rateBps) || rateBps < 0 || rateBps > MAX_RATE_BPS) {
    return err({
      kind: "InvalidRate",
      message: `rateBps must be an integer in [0, ${MAX_RATE_BPS}], got ${rateBps}`,
      rateBps,
    });
  }
  if (!isValidISODate(startDate)) {
    return err({
      kind: "InvalidLoanDate",
      message: `invalid start date: ${startDate}`,
      date: startDate,
    });
  }

  if (installments.length < 1 || installments.length > MAX_INSTALLMENTS) {
    return err({
      kind: "InvalidInstallmentValue",
      message: `a loan needs 1..${MAX_INSTALLMENTS} installments, got ${installments.length}`,
      reason: "count",
    });
  }

  const seen = new Set<number>();
  for (const i of installments) {
    if (!Number.isInteger(i.number) || i.number < 1 || seen.has(i.number)) {
      return err({
        kind: "InvalidInstallmentValue",
        message: `installment numbers must be distinct positive integers, got ${i.number}`,
        reason: "number",
      });
    }
    seen.add(i.number);

    // amount must be strictly positive; principal/interest non-negative — this
    // is what blocks the negative-principal / negative-capital exploit.
    if (!isCents(i.amount) || i.amount <= 0) {
      return err({
        kind: "InvalidInstallmentValue",
        message: `installment ${i.number} amount must be a positive integer in cents, got ${i.amount}`,
        reason: "amount",
      });
    }
    if (!isCents(i.principal)) {
      return err({
        kind: "InvalidInstallmentValue",
        message: `installment ${i.number} principal must be a non-negative integer in cents, got ${i.principal}`,
        reason: "principal",
      });
    }
    if (!isCents(i.interest)) {
      return err({
        kind: "InvalidInstallmentValue",
        message: `installment ${i.number} interest must be a non-negative integer in cents, got ${i.interest}`,
        reason: "interest",
      });
    }
    if (!isValidISODate(i.dueDate)) {
      return err({
        kind: "InvalidLoanDate",
        message: `installment ${i.number} has an invalid due date: ${i.dueDate}`,
        date: i.dueDate,
      });
    }
  }

  return ok(undefined);
}

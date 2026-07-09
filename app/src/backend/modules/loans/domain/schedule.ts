/**
 * Schedule engine (TASK-301) — CoCapital's core math.
 * Flat interest, equal split (D3 #2, locked D4): total = capital × (1 + rate);
 * remainders go to the LAST installment (D5). Pure: no I/O, no now().
 */
import { addPeriods, type Frequency, type ISODate } from "@/lib/dates";
import { type Cents, splitEvenly } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";
import type { ScheduleError } from "./errors";

export type ScheduleInput = {
  /** Principal in cents, > 0. */
  capital: Cents;
  /** Flat rate over the WHOLE loan: 10 = 10% total, not annual. */
  ratePercent: number;
  installmentCount: number;
  frequency: Frequency;
  /** Loan start; first installment = start + 1 period (D3 #4). */
  startDate: ISODate;
};

export type ScheduledInstallment = {
  number: number;
  dueDate: ISODate;
  amount: Cents;
  principal: Cents;
  interest: Cents;
};

export type Schedule = {
  capital: Cents;
  interest: Cents;
  total: Cents;
  installments: ScheduledInstallment[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_INSTALLMENTS = 360;

export function generateSchedule(
  input: ScheduleInput,
): Result<Schedule, ScheduleError> {
  const { capital, ratePercent, installmentCount, frequency, startDate } =
    input;

  if (!Number.isInteger(capital) || capital <= 0) {
    return err({
      kind: "InvalidCapital",
      message: `capital must be a positive integer in cents, got ${capital}`,
      capital,
    });
  }
  if (!Number.isFinite(ratePercent) || ratePercent < 0) {
    return err({
      kind: "InvalidRate",
      message: `rate must be >= 0%, got ${ratePercent}`,
      ratePercent,
    });
  }
  if (
    !Number.isInteger(installmentCount) ||
    installmentCount < 1 ||
    installmentCount > MAX_INSTALLMENTS
  ) {
    return err({
      kind: "InvalidInstallmentCount",
      message: `installment count must be between 1 and ${MAX_INSTALLMENTS}, got ${installmentCount}`,
      installmentCount,
    });
  }
  if (!ISO_DATE.test(startDate) || Number.isNaN(Date.parse(startDate))) {
    return err({
      kind: "InvalidStartDate",
      message: `invalid start date: ${startDate}`,
      startDate,
    });
  }

  const interest = Math.round((capital * ratePercent) / 100);
  const total = capital + interest;

  // Derivation guarantees the D5 invariants by construction:
  // Σamounts = total, Σprincipals = capital, and per row
  // interest = amount − principal ⇒ Σinterests = interest.
  const amounts = splitEvenly(total, installmentCount);
  const principals = splitEvenly(capital, installmentCount);

  const installments: ScheduledInstallment[] = amounts.map((amount, i) => ({
    number: i + 1,
    dueDate: addPeriods(startDate, frequency, i + 1),
    amount,
    principal: principals[i],
    interest: amount - principals[i],
  }));

  return ok({ capital, interest, total, installments });
}

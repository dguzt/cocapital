import * as R from "remeda";

import { addPeriods, isCalendarDate } from "@/lib/dates";
import { type Cents, MAX_CENTS, splitEvenly } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";
import type { LoanError, ScheduleError } from "./errors";
import type { ScheduleInput } from "./schedule-input";
import type { ScheduledInstallment } from "./scheduled-installment";

/** The cuotas a loan is paid back in, adding up to its capital plus interest. */
export class Schedule {
  private static readonly MAX_INSTALLMENTS = 360;

  private constructor(
    readonly capital: Cents,
    readonly interest: Cents,
    readonly total: Cents,
    readonly installments: readonly ScheduledInstallment[],
  ) {}

  /**
   * Generates the cuotas with flat interest split in equal parts; the last
   * cuota absorbs the rounding cents.
   *
   * @param input - Capital, flat rate over the whole loan, number of cuotas,
   *   frequency and start date.
   * @returns The schedule, or `InvalidCapital`, `InvalidRate`,
   *   `InvalidInstallmentCount` or `InvalidStartDate`.
   */
  static generate(input: ScheduleInput): Result<Schedule, ScheduleError> {
    const invalid = Schedule.invalidTerms(input);

    if (invalid) {
      return err(invalid);
    }

    const { capital, ratePercent, installmentCount, frequency, startDate } =
      input;

    const interest = Math.round((capital * ratePercent) / 100);

    const total = capital + interest;

    const amounts = splitEvenly(total, installmentCount);

    const principals = splitEvenly(capital, installmentCount);

    const installments = amounts.map((amount, index) => ({
      number: index + 1,
      dueDate: addPeriods(startDate, frequency, index + 1),
      amount,
      principal: principals[index],
      interest: amount - principals[index],
    }));

    return ok(new Schedule(capital, interest, total, installments));
  }

  /**
   * Accepts cuotas as the partner edited them, if they still add up: a
   * positive capital, 1 to 360 cuotas numbered in order on real days, the
   * principals sum to the capital, each cuota is principal plus interest,
   * and no amount is negative.
   *
   * @param installments - The cuotas, possibly edited in the wizard.
   * @param capital - The loan's principal in cents.
   * @returns The schedule, or `InvalidInstallments` with the broken rule.
   */
  static of(
    installments: readonly ScheduledInstallment[],
    capital: Cents,
  ): Result<Schedule, LoanError> {
    if (!Number.isInteger(capital) || capital <= 0 || capital > MAX_CENTS) {
      return err({
        kind: "InvalidInstallments",
        message: `capital must be a positive integer in cents, got ${capital}`,
        reason: "capital",
      });
    }

    if (installments.length === 0) {
      return err({
        kind: "InvalidInstallments",
        message: "a loan needs at least one installment",
        reason: "empty",
      });
    }

    if (installments.length > Schedule.MAX_INSTALLMENTS) {
      return err({
        kind: "InvalidInstallments",
        message: `a loan has at most ${Schedule.MAX_INSTALLMENTS} installments`,
        reason: "too-many",
      });
    }

    const misnumbered = installments.some(
      (row, index) => row.number !== index + 1,
    );

    if (misnumbered) {
      return err({
        kind: "InvalidInstallments",
        message: "installments must be numbered 1 to n in order",
        reason: "numbering",
      });
    }

    if (installments.some((row) => !isCalendarDate(row.dueDate))) {
      return err({
        kind: "InvalidInstallments",
        message: "every installment needs a real due date",
        reason: "due-date",
      });
    }

    const principal = R.sumBy(installments, (row) => row.principal);

    if (principal !== capital) {
      return err({
        kind: "InvalidInstallments",
        message: `principal shares (${principal}) must sum to capital (${capital})`,
        reason: "principal-mismatch",
      });
    }

    const brokenRow = installments.some(
      (row) =>
        !Number.isInteger(row.principal) ||
        !Number.isInteger(row.interest) ||
        row.principal < 0 ||
        row.interest < 0 ||
        row.amount <= 0 ||
        row.principal + row.interest !== row.amount,
    );

    if (brokenRow) {
      return err({
        kind: "InvalidInstallments",
        message:
          "each installment needs whole non-negative principal and interest adding up to a positive amount",
        reason: "row-invariant",
      });
    }

    return ok(
      new Schedule(
        capital,
        R.sumBy(installments, (row) => row.interest),
        R.sumBy(installments, (row) => row.amount),
        installments,
      ),
    );
  }

  private static invalidTerms(input: ScheduleInput): ScheduleError | null {
    const { capital, ratePercent, installmentCount, startDate } = input;

    if (!Number.isInteger(capital) || capital <= 0) {
      return {
        kind: "InvalidCapital",
        message: `capital must be a positive integer in cents, got ${capital}`,
        capital,
      };
    }

    if (!Number.isFinite(ratePercent) || ratePercent < 0) {
      return {
        kind: "InvalidRate",
        message: `rate must be >= 0%, got ${ratePercent}`,
        ratePercent,
      };
    }

    if (
      !Number.isInteger(installmentCount) ||
      installmentCount < 1 ||
      installmentCount > Schedule.MAX_INSTALLMENTS
    ) {
      return {
        kind: "InvalidInstallmentCount",
        message: `installment count must be between 1 and ${Schedule.MAX_INSTALLMENTS}, got ${installmentCount}`,
        installmentCount,
      };
    }

    if (!isCalendarDate(startDate)) {
      return {
        kind: "InvalidStartDate",
        message: `invalid start date: ${startDate}`,
        startDate,
      };
    }

    return null;
  }
}

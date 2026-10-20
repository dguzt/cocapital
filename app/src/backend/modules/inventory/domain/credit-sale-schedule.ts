import { addPeriods, type Frequency, type ISODate } from "@/lib/dates";
import { type Cents, splitEvenly } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";
import type { CreditSaleError } from "./errors";
import { IsoDate } from "./iso-date";
import type { PlannedInstallment } from "./planned-installment";

/** The equal cuotas an amount is paid in, one period apart. */
export class CreditSaleSchedule {
  static readonly MAX_INSTALLMENTS = 360;

  /**
   * Splits the amount in equal cuotas; the last one absorbs the rounding
   * cents. The first cuota falls one period after the start.
   *
   * @param input - The amount to split, the number of cuotas, the frequency
   *   and the start date.
   * @returns The cuotas, or `InvalidPrice`, `InvalidInstallmentCount` or
   *   `InvalidStartDate`.
   */
  static generate(input: {
    amount: Cents;
    installmentCount: number;
    frequency: Frequency;
    startDate: ISODate;
  }): Result<PlannedInstallment[], CreditSaleError> {
    const { amount, installmentCount, frequency, startDate } = input;

    if (!Number.isInteger(amount) || amount <= 0) {
      return err({
        kind: "InvalidPrice",
        message: `the amount to split must be a positive integer in cents, got ${amount}`,
        price: amount,
      });
    }

    if (
      !Number.isInteger(installmentCount) ||
      installmentCount < 1 ||
      installmentCount > CreditSaleSchedule.MAX_INSTALLMENTS
    ) {
      return err({
        kind: "InvalidInstallmentCount",
        message: `installment count must be between 1 and ${CreditSaleSchedule.MAX_INSTALLMENTS}, got ${installmentCount}`,
        installmentCount,
      });
    }

    if (!IsoDate.isValid(startDate)) {
      return err({
        kind: "InvalidStartDate",
        message: `invalid start date: ${startDate}`,
        startDate,
      });
    }

    return ok(
      splitEvenly(amount, installmentCount).map((share, index) => ({
        dueDate: addPeriods(startDate, frequency, index + 1),
        amount: share,
      })),
    );
  }
}

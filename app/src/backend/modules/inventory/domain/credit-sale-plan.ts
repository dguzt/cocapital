import * as R from "remeda";

import type { Cents } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";
import type { CreditSaleError } from "./errors";
import { IsoDate } from "./iso-date";
import type { PlannedInstallment } from "./planned-installment";

/** What a credit sale is sold for and how it is paid: it always adds up to the price. */
export class CreditSalePlan {
  private constructor(
    readonly price: Cents,
    readonly cost: Cents | null,
    readonly downPayment: Cents,
    readonly installments: readonly PlannedInstallment[],
  ) {}

  /**
   * Accepts the terms as the partner typed them, if the down payment plus
   * every cuota adds up to the price.
   *
   * @param input - Price, optional cost, down payment (0 for none) and the
   *   cuotas, amounts in cents.
   * @returns The plan, or `InvalidPrice`, `InvalidCost`,
   *   `InvalidDownPayment`, `InvalidInstallments` or `ScheduleMismatch`.
   */
  static of(input: {
    price: Cents;
    cost: Cents | null;
    downPayment: Cents;
    installments: readonly PlannedInstallment[];
  }): Result<CreditSalePlan, CreditSaleError> {
    const { price, cost, downPayment, installments } = input;

    if (!Number.isInteger(price) || price <= 0) {
      return err({
        kind: "InvalidPrice",
        message: `price must be a positive integer in cents, got ${price}`,
        price,
      });
    }

    if (cost !== null && (!Number.isInteger(cost) || cost <= 0)) {
      return err({
        kind: "InvalidCost",
        message: `cost must be a positive integer in cents when given, got ${cost}`,
        cost,
      });
    }

    if (
      !Number.isInteger(downPayment) ||
      downPayment < 0 ||
      downPayment >= price
    ) {
      return err({
        kind: "InvalidDownPayment",
        message: `down payment must be between 0 and the price, got ${downPayment}`,
        downPayment,
      });
    }

    const broken = CreditSalePlan.brokenRule(installments);

    if (broken) {
      return err({
        kind: "InvalidInstallments",
        message: `invalid installments: ${broken}`,
        reason: broken,
      });
    }

    const scheduled = downPayment + R.sumBy(installments, (row) => row.amount);

    if (scheduled !== price) {
      return err({
        kind: "ScheduleMismatch",
        message: `down payment plus installments (${scheduled}) must add up to the price (${price})`,
        scheduled,
        expected: price,
      });
    }

    return ok(new CreditSalePlan(price, cost, downPayment, installments));
  }

  /**
   * Names the first rule a list of cuotas breaks.
   *
   * @param installments - The cuotas to check.
   * @returns `empty`, `amount` or `due-date`, or null when they are fine.
   */
  static brokenRule(
    installments: readonly PlannedInstallment[],
  ): string | null {
    if (installments.length === 0) {
      return "empty";
    }

    if (
      installments.some(
        (row) => !Number.isInteger(row.amount) || row.amount <= 0,
      )
    ) {
      return "amount";
    }

    if (installments.some((row) => !IsoDate.isValid(row.dueDate))) {
      return "due-date";
    }

    return null;
  }
}

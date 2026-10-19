import * as R from "remeda";
import type { Cents } from "@/lib/money";
import type { Result } from "@/lib/result";
import { err, ok } from "@/lib/result";
import type { LoanError } from "./errors";
import type { NewLoanInstallment } from "./loan";

/**
 * Checks that a schedule adds up: the principals sum to the capital, each
 * cuota is principal plus interest, and every amount is positive.
 *
 * @param installments - The cuotas, possibly edited in the wizard.
 * @param capital - The loan's principal in cents.
 * @returns Ok, or `InvalidInstallments` with the broken rule.
 */
export function checkSchedule(
  installments: NewLoanInstallment[],
  capital: Cents,
): Result<true, LoanError> {
  if (installments.length === 0) {
    return err({
      kind: "InvalidInstallments",
      message: "a loan needs at least one installment",
      reason: "empty",
    });
  }

  const sumPrincipal = R.sumBy(installments, (i) => i.principal);
  if (sumPrincipal !== capital) {
    return err({
      kind: "InvalidInstallments",
      message: `principal shares (${sumPrincipal}) must sum to capital (${capital})`,
      reason: "principal-mismatch",
    });
  }

  if (
    installments.some(
      (i) => i.amount <= 0 || i.principal + i.interest !== i.amount,
    )
  ) {
    return err({
      kind: "InvalidInstallments",
      message:
        "each installment needs amount > 0 and principal+interest=amount",
      reason: "row-invariant",
    });
  }

  return ok(true);
}

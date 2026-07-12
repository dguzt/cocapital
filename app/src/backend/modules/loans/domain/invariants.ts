/**
 * The money invariants of a schedule (D5 #1). Pure — these are the rules that
 * make the capital honest, so they get tested without a database.
 *
 *   Σ principal        = capital        (the loan lends exactly its principal)
 *   principal+interest = amount         (per row, no cents lost to rounding)
 *   amount             > 0
 */
import * as R from "remeda";
import type { Cents } from "@/lib/money";
import type { Result } from "@/lib/result";
import { err, ok } from "@/lib/result";
import type { LoanError } from "./errors";
import type { NewLoanInstallment } from "./loan";

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

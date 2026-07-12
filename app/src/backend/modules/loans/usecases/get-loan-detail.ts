/**
 * UC-303 · One loan with its schedule.
 *
 * A read, but still a use case: it authorizes (the loan must belong to the
 * caller's group) and it derives (expected interest is the sum over every
 * installment; collected/pending split the rows). "Vencida" is NOT derived
 * here — it depends on today, so the page decides it at render (D3).
 */
import * as R from "remeda";
import { err, ok, type Result } from "@/lib/result";
import type { LoanError } from "../domain/errors";
import type { LoanDetail } from "../domain/loan";
import * as installmentRepo from "../repositories/installment-repository";
import * as loanRepo from "../repositories/loan-repository";

export async function getLoanDetail(
  groupId: string,
  loanId: string,
): Promise<Result<LoanDetail, LoanError>> {
  const loan = await loanRepo.findInGroup(groupId, loanId);
  if (!loan) {
    return err({ kind: "LoanNotFound", message: "loan not found", loanId });
  }

  const rows = await installmentRepo.listByLoan(loanId);
  const [collected, pending] = R.partition(
    rows,
    (r) => r.status === "collected",
  );

  return ok({
    ...loan,
    expectedInterest: R.sumBy(rows, (r) => r.interest),
    collectedAmount: R.sumBy(collected, (r) => r.amount),
    pendingAmount: R.sumBy(pending, (r) => r.amount),
    installments: rows.map((r) => ({
      id: r.id,
      number: r.number,
      dueDate: r.dueDate,
      amount: r.amount,
      principal: r.principal,
      interest: r.interest,
      status: r.status,
      repayMovementId: r.repayMovementId,
    })),
  });
}

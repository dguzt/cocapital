/**
 * UC-303 · One loan with its schedule.
 *
 * A read, but still a use case: it authorizes (the loan must belong to the
 * caller's group) and it derives (expected interest is the sum over every
 * installment; collected/pending split the rows).
 *
 * "Vencida" is NOT derived here — it depends on what day it is today, so the
 * page decides it at render (D3). A row stored as overdue would be lying
 * tomorrow.
 */
import * as R from "remeda";
import type { LoanError } from "@/backend/modules/loans/domain/errors";
import type { LoanDetail } from "@/backend/modules/loans/domain/loan";
import type { InstallmentRepository } from "@/backend/modules/loans/repositories/installment-repository";
import type { LoanRepository } from "@/backend/modules/loans/repositories/loan-repository";
import { err, ok, type Result } from "@/lib/result";

export type GetLoanDetailInput = {
  groupId: string;
  loanId: string;
};

export class GetLoanDetail {
  static inject = ["loans", "installments"] as const;

  constructor(
    private readonly loans: LoanRepository,
    private readonly installments: InstallmentRepository,
  ) {}

  async execute(
    input: GetLoanDetailInput,
  ): Promise<Result<LoanDetail, LoanError>> {
    const loan = await this.loans.findInGroup(input.groupId, input.loanId);

    if (!loan) {
      return err({
        kind: "LoanNotFound",
        message: "loan not found",
        loanId: input.loanId,
      });
    }

    const rows = await this.installments.listByLoan(input.loanId);
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
}

import * as R from "remeda";

import type { LoanError } from "@/backend/modules/loans/domain/errors";
import type { LoanDetail } from "@/backend/modules/loans/domain/loan";
import type { InstallmentRepository } from "@/backend/modules/loans/ports/installment-repository";
import type { LoanRepository } from "@/backend/modules/loans/ports/loan-repository";
import { err, ok, type Result } from "@/lib/result";

export type GetLoanDetailInput = {
  groupId: string;
  loanId: string;
};

/** Reads one loan of the group with its schedule and totals. */
export class GetLoanDetail {
  static inject = ["loans", "installments"] as const;

  constructor(
    private readonly loans: LoanRepository,
    private readonly installments: InstallmentRepository,
  ) {}

  /**
   * Reads the loan. Whether a cuota is overdue depends on today, so the
   * caller decides it.
   *
   * @param input - The group asking and the loan.
   * @returns The loan with its cuotas, expected interest and collected and
   *   pending amounts, or `LoanNotFound`.
   */
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

    const installments = await this.installments.listByLoan(input.loanId);

    const [collected, pending] = R.partition(
      installments,
      (installment) => installment.status === "collected",
    );

    return ok({
      ...loan,
      expectedInterest: R.sumBy(installments, (row) => row.interest),
      collectedAmount: R.sumBy(collected, (row) => row.amount),
      pendingAmount: R.sumBy(pending, (row) => row.amount),
      installments: installments.map((row) => ({
        id: row.id,
        number: row.number,
        dueDate: row.dueDate,
        amount: row.amount,
        principal: row.principal,
        interest: row.interest,
        status: row.status,
        repayMovementId: row.repayMovementId,
      })),
    });
  }
}

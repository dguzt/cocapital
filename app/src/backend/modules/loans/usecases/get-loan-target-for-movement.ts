/**
 * UC-308 · Resolve the loan a ledger row links to.
 *
 * A `lend`/`repay` movement is corrected from the loan, never from the ledger
 * (the movement dialog derives the user here). But `movements` may not know
 * about loans, so this loans use case answers "where does this movement send
 * me?" — the loan, and for a `repay`, the exact cuota to highlight.
 *
 * Authorizes by group like the other reads: a movement of another group
 * resolves to null.
 */
import type { MovementType } from "../../movements/domain/movement";
import type { InstallmentRepository } from "../repositories/installment-repository";
import type { LoanRepository } from "../repositories/loan-repository";

export type GetLoanTargetForMovementInput = {
  groupId: string;
  movementId: string;
  movementType: MovementType;
};

export type LoanTarget = {
  loanId: string;
  /** The cuota to highlight — set for a `repay`, null for a `lend`. */
  installmentId: string | null;
};

export class GetLoanTargetForMovement {
  static inject = ["loans", "installments"] as const;

  constructor(
    private readonly loans: LoanRepository,
    private readonly installments: InstallmentRepository,
  ) {}

  async execute(
    input: GetLoanTargetForMovementInput,
  ): Promise<LoanTarget | null> {
    if (input.movementType === "lend") {
      const loanId = await this.loans.loanIdByLendMovement(
        input.groupId,
        input.movementId,
      );

      return loanId ? { loanId, installmentId: null } : null;
    }

    if (input.movementType === "repay") {
      const row = await this.installments.findByRepayMovement(
        input.groupId,
        input.movementId,
      );

      return row
        ? { loanId: row.loanId, installmentId: row.installmentId }
        : null;
    }

    return null;
  }
}

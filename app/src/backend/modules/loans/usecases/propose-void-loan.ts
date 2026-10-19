import type { LoanError } from "@/backend/modules/loans/domain/errors";
import type { LoanRepository } from "@/backend/modules/loans/ports/loan-repository";
import type { PendingChangeError } from "@/backend/modules/movements/domain/errors";
import type { ProposeSystemVoid } from "@/backend/modules/movements/usecases/propose-system-void";
import { err, type Result } from "@/lib/result";

export type ProposeVoidLoanInput = {
  groupId: string;
  actorId: string;
  loanId: string;
};

/**
 * Proposes cancelling a whole loan, as a void of its lend movement. Another
 * partner approves it in the approvals inbox.
 */
export class ProposeVoidLoan {
  static inject = ["loans", "proposeSystemVoid"] as const;

  constructor(
    private readonly loans: LoanRepository,
    private readonly proposeSystemVoid: ProposeSystemVoid,
  ) {}

  /**
   * Opens the pending cancellation.
   *
   * @param input - The group, the proposing partner and the loan.
   * @returns The pending change's id, or `LoanNotFound`,
   *   `LoanAlreadyVoided` or why the void cannot be proposed.
   */
  async execute(
    input: ProposeVoidLoanInput,
  ): Promise<Result<{ pendingId: string }, LoanError | PendingChangeError>> {
    const loan = await this.loans.findInGroup(input.groupId, input.loanId);

    if (!loan) {
      return err({
        kind: "LoanNotFound",
        message: "loan not found",
        loanId: input.loanId,
      });
    }

    if (loan.status === "voided") {
      return err({
        kind: "LoanAlreadyVoided",
        message: "loan is already voided",
        loanId: input.loanId,
      });
    }

    return this.proposeSystemVoid.execute({
      groupId: input.groupId,
      actorId: input.actorId,
      movementId: loan.lendMovementId,
    });
  }
}

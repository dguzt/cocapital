/**
 * UC-306 · Propose to cancel an ENTIRE loan (corrección de un error de captura).
 *
 * A loan is voided from the loan, never from its `lend` movement in the ledger.
 * But the trámite is the same doble confirmación as any other change: this only
 * PROPOSES, and the partner approves it in the shared inbox. On approval the
 * `lend` and every collection are reversed (loans/usecases/void-loan.ts).
 *
 * It is modeled as a void proposed on the loan's `lend` movement, so it reuses
 * the whole pending-change machinery. This use case is the only place that maps
 * "loan" → its lend movement and refuses a loan that is already voided.
 */

import type { LoanError } from "@/backend/modules/loans/domain/errors";
import type { LoanRepository } from "@/backend/modules/loans/repositories/loan-repository";
import type { PendingChangeError } from "@/backend/modules/movements/domain/errors";
import type { ProposeSystemVoid } from "@/backend/modules/movements/usecases/propose-system-void";
import { err, type Result } from "@/lib/result";

export type ProposeVoidLoanInput = {
  groupId: string;
  actorId: string;
  loanId: string;
};

export class ProposeVoidLoan {
  static inject = ["loans", "proposeSystemVoid"] as const;

  constructor(
    private readonly loans: LoanRepository,
    private readonly proposeSystemVoid: ProposeSystemVoid,
  ) {}

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

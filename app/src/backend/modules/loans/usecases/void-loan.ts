/**
 * UC-307 · Reverse an entire loan on approval — the inverse of create-loan,
 * plus every collection it produced.
 *
 * This is the `loans/usecases/void-loan.ts` named in apply-approved-change.ts:
 * voiding a loan's `lend` entry IS voiding the loan. It is a loan concern and
 * not a ledger void because only the loan knows which `repay` movements are its
 * collections.
 *
 * Capital stays whole only if all of it lands in one transaction (same reason
 * as undo-collection): the loan is marked voided so its cuotas leave `lent`,
 * the `lend` movement is voided so its principal returns to cash, and every
 * `repay` is voided so each collection's cash comes back out. It returns the
 * writes; DecideChange batches them with the approval.
 *
 * Async because it must enumerate the collected cuotas' repay movements — the
 * ChangeApplier facade awaits it. Movement voids go through VoidEntry (a
 * movements use case), so this loans use case never writes the movements table.
 */
import type { Write } from "@/backend/infra/db/write";
import type { InstallmentRepository } from "@/backend/modules/loans/repositories/installment-repository";
import type { LoanRepository } from "@/backend/modules/loans/repositories/loan-repository";
import type { VoidEntry } from "@/backend/modules/movements/usecases/void-entry";

export class VoidLoan {
  static inject = ["loans", "installments", "voidEntry"] as const;

  constructor(
    private readonly loans: LoanRepository,
    private readonly installments: InstallmentRepository,
    private readonly voidEntry: VoidEntry,
  ) {}

  async writesFor(lendMovementId: string): Promise<Write[]> {
    const loan = await this.loans.findByLendMovement(lendMovementId);

    if (!loan) {
      // Unreachable: the approved change targeted a real loan's lend movement.
      throw new Error("no loan owns this lend movement");
    }

    const repayMovementIds = await this.installments.repayMovementIdsOf(
      loan.id,
    );

    return [
      this.loans.voidStmt(loan.id),
      ...this.voidEntry.writesFor(lendMovementId),
      ...repayMovementIds.flatMap((id) => this.voidEntry.writesFor(id)),
    ];
  }
}

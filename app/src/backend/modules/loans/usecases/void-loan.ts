import type { InstallmentRepository } from "@/backend/modules/loans/ports/installment-repository";
import type { LoanRepository } from "@/backend/modules/loans/ports/loan-repository";
import type { VoidEntry } from "@/backend/modules/movements/usecases/void-entry";

export type VoidLoanInput = {
  lendMovementId: string;
};

/**
 * Cancels a loan: the loan stops counting as lent, its lend movement returns
 * the capital to cash, and every collection's repay movement takes its cash
 * back out.
 */
export class VoidLoan {
  static inject = ["loans", "installments", "voidEntry"] as const;

  constructor(
    private readonly loans: LoanRepository,
    private readonly installments: InstallmentRepository,
    private readonly voidEntry: VoidEntry,
  ) {}

  /**
   * Voids the loan behind a lend movement. Runs inside the unit of work of
   * the approval.
   *
   * @param input - The loan's lend movement.
   * @throws When no loan was booked by that movement.
   */
  async execute(input: VoidLoanInput): Promise<void> {
    const loanId = await this.loans.idByLendMovement(input.lendMovementId);

    if (!loanId) {
      throw new Error("no loan owns this lend movement");
    }

    const repayMovementIds = await this.installments.repayMovementIdsOf(loanId);

    await this.loans.void(loanId);

    await this.voidEntry.execute({ movementId: input.lendMovementId });

    for (const movementId of repayMovementIds) {
      await this.voidEntry.execute({ movementId });
    }
  }
}

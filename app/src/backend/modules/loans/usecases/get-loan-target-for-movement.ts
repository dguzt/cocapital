import type { LoanTarget } from "@/backend/modules/loans/domain/loan-target";
import type { InstallmentRepository } from "@/backend/modules/loans/ports/installment-repository";
import type { LoanRepository } from "@/backend/modules/loans/ports/loan-repository";
import type { MovementType } from "@/backend/modules/movements/domain/movement";

export type GetLoanTargetForMovementInput = {
  groupId: string;
  movementId: string;
  movementType: MovementType;
};

/** Finds the loan, and for a repay the cuota, that a ledger row belongs to. */
export class GetLoanTargetForMovement {
  static inject = ["loans", "installments"] as const;

  constructor(
    private readonly loans: LoanRepository,
    private readonly installments: InstallmentRepository,
  ) {}

  /**
   * Resolves where the movement leads.
   *
   * @param input - The group asking, the movement and its type.
   * @returns The loan and cuota, or null for a movement that is not a lend or
   *   repay of this group.
   */
  async execute(
    input: GetLoanTargetForMovementInput,
  ): Promise<LoanTarget | null> {
    if (input.movementType === "lend") {
      const loanId = await this.loans.idByLendMovement(
        input.movementId,
        input.groupId,
      );

      return loanId ? { loanId, installmentId: null } : null;
    }

    if (input.movementType === "repay") {
      return this.installments.findByRepayMovement(
        input.groupId,
        input.movementId,
      );
    }

    return null;
  }
}

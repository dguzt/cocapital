import type { InstallmentRepository } from "@/backend/modules/loans/ports/installment-repository";
import type { VoidEntry } from "@/backend/modules/movements/usecases/void-entry";

export type UndoCollectionInput = {
  repayMovementId: string;
};

/**
 * Reverses a collection: the repay movement is voided and its cuota is
 * pending again, so cash, lent and expected interest go back to where they
 * were before the collection.
 */
export class UndoCollection {
  static inject = ["voidEntry", "installments"] as const;

  constructor(
    private readonly voidEntry: VoidEntry,
    private readonly installments: InstallmentRepository,
  ) {}

  /**
   * Undoes the collection. Runs inside the unit of work of the approval.
   *
   * @param input - The repay movement of the collection.
   */
  async execute(input: UndoCollectionInput): Promise<void> {
    await this.voidEntry.execute({ movementId: input.repayMovementId });

    await this.installments.reopenByRepayMovement(input.repayMovementId);
  }
}

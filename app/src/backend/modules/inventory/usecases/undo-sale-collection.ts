import type { CreditSaleRepository } from "@/backend/modules/inventory/ports/credit-sale-repository";
import type { VoidEntry } from "@/backend/modules/movements/usecases/void-entry";

export type UndoSaleCollectionInput = {
  collectMovementId: string;
};

/**
 * Reverses a cobro of a credit sale: the collect_sale movement is voided and
 * its cuota is pending again, so cash, receivable and margin go back to
 * where they were before the cobro.
 */
export class UndoSaleCollection {
  static inject = ["voidEntry", "creditSales"] as const;

  constructor(
    private readonly voidEntry: VoidEntry,
    private readonly creditSales: CreditSaleRepository,
  ) {}

  /**
   * Undoes the cobro. Runs inside the unit of work of the approval.
   *
   * @param input - The collect_sale movement of the cobro.
   */
  async execute(input: UndoSaleCollectionInput): Promise<void> {
    await this.voidEntry.execute({ movementId: input.collectMovementId });

    await this.creditSales.reopenByCollectMovement(input.collectMovementId);
  }
}

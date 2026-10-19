import type { VoidEntry } from "@/backend/modules/movements/usecases/void-entry";

export type UndoSaleInput = {
  movementId: string;
};

/**
 * Reverses a sale. Inventory is derived from the ledger today, so voiding the
 * sale's movement is the whole undo; restocking belongs here once stock is
 * stored.
 */
export class UndoSale {
  static inject = ["voidEntry"] as const;

  constructor(private readonly voidEntry: VoidEntry) {}

  /**
   * Undoes the sale.
   *
   * @param input - The sale's movement.
   */
  async execute(input: UndoSaleInput): Promise<void> {
    await this.voidEntry.execute(input);
  }
}

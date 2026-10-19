import type { VoidEntry } from "@/backend/modules/movements/usecases/void-entry";

export type UndoPurchaseInput = {
  movementId: string;
};

/**
 * Reverses a purchase. Inventory is derived from the ledger today, so voiding
 * the purchase's movement is the whole undo.
 */
export class UndoPurchase {
  static inject = ["voidEntry"] as const;

  constructor(private readonly voidEntry: VoidEntry) {}

  /**
   * Undoes the purchase.
   *
   * @param input - The purchase's movement.
   */
  async execute(input: UndoPurchaseInput): Promise<void> {
    await this.voidEntry.execute(input);
  }
}

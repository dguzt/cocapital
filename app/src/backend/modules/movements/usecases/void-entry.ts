import type { MovementRepository } from "@/backend/modules/movements/ports/movement-repository";

export type VoidEntryInput = {
  movementId: string;
};

/**
 * Voids a movement in the ledger and nothing else. Owners that must also undo
 * their own state (a cuota, a sale) call this as one part of their undo.
 */
export class VoidEntry {
  static inject = ["movements"] as const;

  constructor(private readonly movements: MovementRepository) {}

  /**
   * Marks the movement voided.
   *
   * @param input - The movement.
   */
  async execute(input: VoidEntryInput): Promise<void> {
    await this.movements.void(input.movementId);
  }
}

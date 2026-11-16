import type { MovementRepository } from "@/backend/modules/movements/ports/movement-repository";

export type VoidEntriesInput = {
  movementIds: readonly string[];
};

/** Voids several movements of the ledger at once, for an owner undoing everything it wrote. */
export class VoidEntries {
  static inject = ["movements"] as const;

  constructor(private readonly movements: MovementRepository) {}

  /**
   * Marks every movement voided.
   *
   * @param input - The movements.
   */
  async execute(input: VoidEntriesInput): Promise<void> {
    await this.movements.voidMany(input.movementIds);
  }
}

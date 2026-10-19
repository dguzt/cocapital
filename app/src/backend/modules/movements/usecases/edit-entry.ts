import type { MovementSnapshot } from "@/backend/modules/movements/domain/movement";
import type { MovementRepository } from "@/backend/modules/movements/ports/movement-repository";

export type EditEntryInput = {
  movementId: string;
  after: MovementSnapshot;
};

/** Applies an approved edit to a movement that stands alone in the ledger. */
export class EditEntry {
  static inject = ["movements"] as const;

  constructor(private readonly movements: MovementRepository) {}

  /**
   * Replaces the movement's editable fields.
   *
   * @param input - The movement and its approved new values.
   */
  async execute(input: EditEntryInput): Promise<void> {
    await this.movements.applyEdit(input.movementId, input.after);
  }
}

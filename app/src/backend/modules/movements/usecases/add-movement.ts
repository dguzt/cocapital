import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import type { MovementEntry } from "@/backend/modules/movements/domain/movement-entry";
import type { MovementRepository } from "@/backend/modules/movements/ports/movement-repository";

export type AddMovementInput = MovementEntry;

/** Writes one movement to a group's ledger. Movements are append-only. */
export class AddMovement {
  static inject = ["movements"] as const;

  constructor(private readonly movements: MovementRepository) {}

  /**
   * Appends the movement.
   *
   * @param input - The validated movement, its group and its author.
   * @returns The movement as the feed shows it.
   */
  async execute(input: AddMovementInput): Promise<LedgerMovement> {
    return this.movements.append(input);
  }
}

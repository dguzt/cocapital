import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import type { MovementRepository } from "@/backend/modules/movements/ports/movement-repository";

export type ListMovementsInput = {
  groupId: string;
};

/** Reads a group's whole ledger. */
export class ListMovements {
  static inject = ["movements"] as const;

  constructor(private readonly movements: MovementRepository) {}

  /**
   * Lists the ledger.
   *
   * @param input - The group.
   * @returns Every movement with its author, newest first.
   */
  async execute(input: ListMovementsInput): Promise<LedgerMovement[]> {
    return this.movements.listByGroup(input.groupId);
  }
}

import type { MovementTotal } from "@/backend/modules/movements/domain/movement-total";
import type { MovementRepository } from "@/backend/modules/movements/ports/movement-repository";

export type TotalMovementsInput = {
  groupId: string;
};

/** Adds up a group's ledger by type and status. */
export class TotalMovements {
  static inject = ["movements"] as const;

  constructor(private readonly movements: MovementRepository) {}

  /**
   * Sums the ledger without reading it row by row.
   *
   * @param input - The group.
   * @returns One total per type and status.
   */
  async execute(input: TotalMovementsInput): Promise<MovementTotal[]> {
    return this.movements.totalsByGroup(input.groupId);
  }
}

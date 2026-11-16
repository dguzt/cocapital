import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import type { MovementRepository } from "@/backend/modules/movements/ports/movement-repository";
import { pageOf } from "@/lib/page";

export type ListMovementsInput = {
  groupId: string;
  limit?: number;
  after?: string;
};

/** Reads one page of a group's ledger. */
export class ListMovements {
  static inject = ["movements"] as const;

  constructor(private readonly movements: MovementRepository) {}

  /**
   * Lists the ledger, newest first, one page at a time.
   *
   * @param input - The group, the page size and the last movement already read.
   * @returns Up to one page of movements with their author.
   */
  async execute(input: ListMovementsInput): Promise<LedgerMovement[]> {
    return this.movements.listPage(input.groupId, pageOf(input));
  }
}

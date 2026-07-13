/** The group's whole ledger, newest first. The feed shows it; M5 derives from it. */
import type {
  LedgerMovement,
  MovementRepository,
} from "../repositories/movement-repository";

export type { LedgerMovement };

export type ListMovementsInput = {
  groupId: string;
};

export class ListMovements {
  static inject = ["movements"] as const;

  constructor(private readonly movements: MovementRepository) {}

  async execute(input: ListMovementsInput): Promise<LedgerMovement[]> {
    return this.movements.listByGroup(input.groupId);
  }
}

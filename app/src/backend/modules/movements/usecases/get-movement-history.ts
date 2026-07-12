/** UC-404 · The immutable history of one movement: every proposal, any outcome. */
import type {
  ChangeHistoryItem,
  ChangeRepository,
} from "../repositories/change-repository";

export type { ChangeHistoryItem };

export type GetMovementHistoryInput = {
  groupId: string;
  movementId: string;
};

export class GetMovementHistory {
  static inject = ["changes"] as const;

  constructor(private readonly changes: ChangeRepository) {}

  async execute(input: GetMovementHistoryInput): Promise<ChangeHistoryItem[]> {
    return this.changes.listForMovement(input.groupId, input.movementId);
  }
}

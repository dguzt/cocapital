import type { ChangeHistoryItem } from "@/backend/modules/movements/domain/change-history-item";
import type { ChangeRepository } from "@/backend/modules/movements/ports/change-repository";

export type GetMovementHistoryInput = {
  groupId: string;
  movementId: string;
};

/** Reads every change ever proposed on one movement, whatever its outcome. */
export class GetMovementHistory {
  static inject = ["changes"] as const;

  constructor(private readonly changes: ChangeRepository) {}

  /**
   * Lists the movement's history.
   *
   * @param input - The group asking and the movement.
   * @returns The changes, newest first; empty for another group's movement.
   */
  async execute(input: GetMovementHistoryInput): Promise<ChangeHistoryItem[]> {
    return this.changes.listForMovement(input.groupId, input.movementId);
  }
}

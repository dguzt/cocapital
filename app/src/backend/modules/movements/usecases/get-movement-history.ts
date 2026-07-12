/** UC-404 · The immutable history of one movement: every proposal, any outcome. */
import type { ChangeHistoryItem } from "../repositories/change-repository";
import * as changeRepo from "../repositories/change-repository";

export async function getMovementHistory(
  groupId: string,
  movementId: string,
): Promise<ChangeHistoryItem[]> {
  return changeRepo.listForMovement(groupId, movementId);
}

export type { ChangeHistoryItem } from "../repositories/change-repository";

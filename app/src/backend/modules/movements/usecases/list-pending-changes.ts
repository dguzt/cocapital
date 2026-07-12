/** Every undecided change of the group — the approvals banner reads this. */
import type { PendingChangeItem } from "../repositories/change-repository";
import * as changeRepo from "../repositories/change-repository";

export async function listPendingChanges(
  groupId: string,
): Promise<PendingChangeItem[]> {
  return changeRepo.listPending(groupId);
}

export type { PendingChangeItem } from "../repositories/change-repository";

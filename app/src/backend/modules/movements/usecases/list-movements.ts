/** The group's whole ledger, newest first. The feed shows it; M5 derives from it. */
import type { LedgerMovement } from "../repositories/movement-repository";
import * as movementRepo from "../repositories/movement-repository";

export async function listMovements(
  groupId: string,
): Promise<LedgerMovement[]> {
  return movementRepo.listByGroup(groupId);
}

/** The shape the feed and the capital reducer consume. */
export type { LedgerMovement } from "../repositories/movement-repository";

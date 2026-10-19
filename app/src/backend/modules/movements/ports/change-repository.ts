import type { ChangeDecision } from "@/backend/modules/movements/domain/change-decision";
import type { ChangeHistoryItem } from "@/backend/modules/movements/domain/change-history-item";
import type { ChangeUnderDecision } from "@/backend/modules/movements/domain/change-under-decision";
import type { ProposedChange } from "@/backend/modules/movements/domain/pending";
import type { PendingChangeItem } from "@/backend/modules/movements/domain/pending-change-item";

/** Storage of proposed changes and their decisions. */
export interface ChangeRepository {
  /**
   * Tells whether a movement already has a change waiting for an OK.
   *
   * @param movementId - The movement.
   * @returns True when an undecided change exists.
   */
  hasPendingFor(movementId: string): Promise<boolean>;

  /**
   * Stores a new pending change.
   *
   * @param change - The proposal.
   * @returns The id of the stored change.
   */
  propose(change: ProposedChange): Promise<{ id: string }>;

  /**
   * Finds a change together with the movement it targets.
   *
   * @param pendingId - The change.
   * @returns The change, or null when it does not exist.
   */
  findUnderDecision(pendingId: string): Promise<ChangeUnderDecision | null>;

  /**
   * Records the decision on a change.
   *
   * @param pendingId - The change.
   * @param decision - Approved or rejected, by whom and when.
   */
  decide(pendingId: string, decision: ChangeDecision): Promise<void>;

  /**
   * Lists a group's changes still waiting for an OK.
   *
   * @param groupId - The group.
   * @returns The pending changes, newest first.
   */
  listPending(groupId: string): Promise<PendingChangeItem[]>;

  /**
   * Lists every change ever proposed on one movement of the group.
   *
   * @param groupId - The group asking.
   * @param movementId - The movement.
   * @returns The history, newest first; empty for another group's movement.
   */
  listForMovement(
    groupId: string,
    movementId: string,
  ): Promise<ChangeHistoryItem[]>;
}

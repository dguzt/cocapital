import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import type { MovementSnapshot } from "@/backend/modules/movements/domain/movement";
import type { MovementEntry } from "@/backend/modules/movements/domain/movement-entry";
import type { StoredMovement } from "@/backend/modules/movements/domain/stored-movement";

/** Storage of the ledger. */
export interface MovementRepository {
  /**
   * Lists a group's ledger.
   *
   * @param groupId - The group.
   * @returns Every movement with its author, newest first.
   */
  listByGroup(groupId: string): Promise<LedgerMovement[]>;

  /**
   * Finds one movement, only if it belongs to the group.
   *
   * @param groupId - The group asking.
   * @param movementId - The movement.
   * @returns The movement, or null when it is missing or in another group.
   */
  findInGroup(
    groupId: string,
    movementId: string,
  ): Promise<StoredMovement | null>;

  /**
   * Appends a movement to the ledger.
   *
   * @param entry - The movement and who writes it.
   * @returns The stored movement with its author's name.
   */
  append(entry: MovementEntry): Promise<LedgerMovement>;

  /**
   * Marks a movement voided. Movements are never deleted.
   *
   * @param movementId - The movement.
   */
  void(movementId: string): Promise<void>;

  /**
   * Replaces the editable fields of a movement.
   *
   * @param movementId - The movement.
   * @param snapshot - Its new amount, cost, concept and date.
   */
  applyEdit(movementId: string, snapshot: MovementSnapshot): Promise<void>;
}

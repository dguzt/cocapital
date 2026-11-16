import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import type {
  MovementSnapshot,
  MovementStatus,
} from "@/backend/modules/movements/domain/movement";
import type { MovementEntry } from "@/backend/modules/movements/domain/movement-entry";
import type { MovementTotal } from "@/backend/modules/movements/domain/movement-total";
import type { StoredMovement } from "@/backend/modules/movements/domain/stored-movement";
import type { PageRequest } from "@/lib/page";

/** Storage of the ledger. */
export interface MovementRepository {
  /**
   * Lists one page of a group's ledger.
   *
   * @param groupId - The group.
   * @param page - How many movements, and the last one already read.
   * @returns The movements with their author, newest first.
   */
  listPage(groupId: string, page: PageRequest): Promise<LedgerMovement[]>;

  /**
   * Adds up a group's ledger.
   *
   * @param groupId - The group.
   * @returns One total per type and status.
   */
  totalsByGroup(groupId: string): Promise<MovementTotal[]>;

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

  /**
   * Holds the movement until the unit of work ends, so no one else changes it meanwhile.
   *
   * @param movementId - The movement.
   * @returns Its status, or null when it does not exist.
   */
  lock(movementId: string): Promise<MovementStatus | null>;

  /**
   * Marks several movements voided in one write.
   *
   * @param movementIds - The movements.
   */
  voidMany(movementIds: readonly string[]): Promise<void>;
}

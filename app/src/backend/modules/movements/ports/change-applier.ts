import type { ApprovedChange } from "@/backend/modules/movements/domain/approved-change";

/** Whoever owns a movement and knows how to apply an approved change to it. */
export interface ChangeApplier {
  /**
   * Applies the change, inside the unit of work that approves it.
   *
   * @param change - The approved edit or void.
   */
  apply(change: ApprovedChange): Promise<void>;
}

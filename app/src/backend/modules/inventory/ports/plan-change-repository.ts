import type { PlanChange } from "@/backend/modules/inventory/domain/plan-change";
import type { PlanChangeEntry } from "@/backend/modules/inventory/domain/plan-change-entry";

/** The record of every rewrite of a credit sale's plan. */
export interface PlanChangeRepository {
  /**
   * Records a rewrite.
   *
   * @param entry - The sale, the partner and how many pending cuotas there
   *   were and are.
   */
  record(entry: PlanChangeEntry): Promise<void>;

  /**
   * Lists the rewrites of a group's sales.
   *
   * @param groupId - The group.
   * @returns The rewrites, newest first.
   */
  listByGroup(groupId: string): Promise<PlanChange[]>;
}

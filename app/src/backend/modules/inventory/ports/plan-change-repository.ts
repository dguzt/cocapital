import type { PlanChange } from "@/backend/modules/inventory/domain/plan-change";
import type { PlanChangeEntry } from "@/backend/modules/inventory/domain/plan-change-entry";
import type { PageRequest } from "@/lib/page";

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
   * Lists one page of the rewrites of a group's sales.
   *
   * @param groupId - The group.
   * @param page - How many rewrites, and the last one already read.
   * @returns The rewrites, newest first.
   */
  listPage(groupId: string, page: PageRequest): Promise<PlanChange[]>;
}

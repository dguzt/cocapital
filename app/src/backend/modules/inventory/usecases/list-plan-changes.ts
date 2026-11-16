import type { PlanChange } from "@/backend/modules/inventory/domain/plan-change";
import type { PlanChangeRepository } from "@/backend/modules/inventory/ports/plan-change-repository";
import { pageOf } from "@/lib/page";

export type ListPlanChangesInput = {
  groupId: string;
  limit?: number;
  after?: string;
};

/** Reads one page of the rewrites of the group's credit sale plans, for the activity. */
export class ListPlanChanges {
  static inject = ["planChanges"] as const;

  constructor(private readonly planChanges: PlanChangeRepository) {}

  /**
   * Lists the rewrites, newest first, one page at a time.
   *
   * @param input - The group, the page size and the last rewrite already read.
   * @returns Up to one page of rewrites.
   */
  async execute(input: ListPlanChangesInput): Promise<PlanChange[]> {
    return this.planChanges.listPage(input.groupId, pageOf(input));
  }
}

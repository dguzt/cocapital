import type { PlanChange } from "@/backend/modules/inventory/domain/plan-change";
import type { PlanChangeRepository } from "@/backend/modules/inventory/ports/plan-change-repository";

export type ListPlanChangesInput = {
  groupId: string;
};

/** Reads every rewrite of the group's credit sale plans, for the activity. */
export class ListPlanChanges {
  static inject = ["planChanges"] as const;

  constructor(private readonly planChanges: PlanChangeRepository) {}

  /**
   * Lists the rewrites.
   *
   * @param input - The group.
   * @returns The rewrites, newest first.
   */
  async execute(input: ListPlanChangesInput): Promise<PlanChange[]> {
    return this.planChanges.listByGroup(input.groupId);
  }
}

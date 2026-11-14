import type { Group } from "@/backend/modules/groups/domain/group";
import type { GroupRepository } from "@/backend/modules/groups/ports/group-repository";

export type ListMyGroupsInput = {
  userId: string;
};

/** Lists every group a partner works in. */
export class ListMyGroups {
  static inject = ["groups"] as const;

  constructor(private readonly groups: GroupRepository) {}

  /**
   * Reads the partner's groups, oldest first.
   *
   * @param input - The partner.
   * @returns Their groups, or an empty list when they have none yet.
   */
  async execute(input: ListMyGroupsInput): Promise<Group[]> {
    return this.groups.groupsOf(input.userId);
  }
}

import type { Group } from "@/backend/modules/groups/domain/group";
import type { GroupRepository } from "@/backend/modules/groups/ports/group-repository";

export type GetGroupOfInput = {
  userId: string;
  groupId: string;
};

/** Opens one group for a partner who belongs to it. */
export class GetGroupOf {
  static inject = ["groups"] as const;

  constructor(private readonly groups: GroupRepository) {}

  /**
   * Reads the group only when the partner is one of its members.
   *
   * @param input - The partner and the group they ask for.
   * @returns The group, or null when it does not exist or is not theirs.
   */
  async execute(input: GetGroupOfInput): Promise<Group | null> {
    const group = await this.groups.findById(input.groupId);

    if (!group?.hasMember(input.userId)) {
      return null;
    }

    return group;
  }
}

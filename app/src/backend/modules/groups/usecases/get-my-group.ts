import type { Group } from "@/backend/modules/groups/domain/group";
import type { GroupRepository } from "@/backend/modules/groups/ports/group-repository";

export type GetMyGroupInput = {
  userId: string;
};

/** Finds the group a partner works in. */
export class GetMyGroup {
  static inject = ["groups"] as const;

  constructor(private readonly groups: GroupRepository) {}

  /**
   * Reads the partner's group.
   *
   * @param input - The partner.
   * @returns Their group, or null when they have not created or joined one.
   */
  async execute(input: GetMyGroupInput): Promise<Group | null> {
    const [group] = await this.groups.groupsOf(input.userId);

    return group ?? null;
  }
}

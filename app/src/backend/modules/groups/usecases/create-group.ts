import { Group } from "@/backend/modules/groups/domain/group";
import type { GroupError } from "@/backend/modules/groups/domain/group-error";
import type { Partner } from "@/backend/modules/groups/domain/partner";
import type { GroupRepository } from "@/backend/modules/groups/ports/group-repository";
import { err, type Result } from "@/lib/result";

export type CreateGroupInput = {
  creator: Partner;
  name: string;
};

/** Founds a new group; a partner may run several. */
export class CreateGroup {
  static inject = ["groups"] as const;

  private static readonly MAX_GROUPS_PER_PARTNER = 20;

  constructor(private readonly groups: GroupRepository) {}

  /**
   * Creates the group with the partner as its creator.
   *
   * @param input - The founding partner and the group name as typed.
   * @returns The new group, `InvalidGroupName`, or `TooManyGroups` once the
   *   partner is in {@link CreateGroup.MAX_GROUPS_PER_PARTNER} groups.
   */
  async execute(input: CreateGroupInput): Promise<Result<Group, GroupError>> {
    const groups = await this.groups.groupsOf(input.creator.userId);

    if (groups.length >= CreateGroup.MAX_GROUPS_PER_PARTNER) {
      return err({
        kind: "TooManyGroups",
        message: `a partner can be in at most ${CreateGroup.MAX_GROUPS_PER_PARTNER} groups`,
        userId: input.creator.userId,
      });
    }

    const created = Group.create(input.name, input.creator);

    if (!created.ok) {
      return created;
    }

    await this.groups.create(created.value);

    return created;
  }
}

import { Group } from "@/backend/modules/groups/domain/group";
import type { GroupError } from "@/backend/modules/groups/domain/group-error";
import type { Partner } from "@/backend/modules/groups/domain/partner";
import type { GroupRepository } from "@/backend/modules/groups/ports/group-repository";
import { err, type Result } from "@/lib/result";

export type CreateGroupInput = {
  creator: Partner;
  name: string;
};

/** Founds a new group for a partner who has none yet. */
export class CreateGroup {
  static inject = ["groups"] as const;

  constructor(private readonly groups: GroupRepository) {}

  /**
   * Creates the group with the partner as its creator.
   *
   * @param input - The founding partner and the group name as typed.
   * @returns The new group, or `InvalidGroupName` or `AlreadyInGroup`.
   */
  async execute(input: CreateGroupInput): Promise<Result<Group, GroupError>> {
    const [current] = await this.groups.groupsOf(input.creator.userId);

    if (current) {
      return err({
        kind: "AlreadyInGroup",
        message: "a partner belongs to one group at most",
        groupId: current.id,
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

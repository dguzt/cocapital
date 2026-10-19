import type { Group } from "@/backend/modules/groups/domain/group";
import type { GroupError } from "@/backend/modules/groups/domain/group-error";
import { InviteCode } from "@/backend/modules/groups/domain/invite-code";
import type { Partner } from "@/backend/modules/groups/domain/partner";
import type { GroupRepository } from "@/backend/modules/groups/ports/group-repository";
import { err, ok, type Result } from "@/lib/result";

export type JoinGroupInput = {
  partner: Partner;
  code: string;
};

/** Seats a partner in the group behind an invite code. */
export class JoinGroup {
  static inject = ["groups"] as const;

  constructor(private readonly groups: GroupRepository) {}

  /**
   * Joins the partner to the group. Joining a group you already belong to
   * is not an error.
   *
   * @param input - The partner who joins and the invite code they received.
   * @returns The group with the partner in it, or `InviteNotFound`,
   *   `AlreadyInGroup` or `GroupFull`.
   */
  async execute(input: JoinGroupInput): Promise<Result<Group, GroupError>> {
    const code = InviteCode.from(input.code);

    const group = await this.groups.findByInviteCode(code);

    if (!group) {
      return err({
        kind: "InviteNotFound",
        message: `no group for invite code ${code.value}`,
        code: code.value,
      });
    }

    if (group.hasMember(input.partner.userId)) {
      return ok(group);
    }

    const [current] = await this.groups.groupsOf(input.partner.userId);

    if (current) {
      return err({
        kind: "AlreadyInGroup",
        message: "a partner belongs to one group at most",
        groupId: current.id,
      });
    }

    const admitted = group.admit(input.partner);

    if (!admitted.ok) {
      return admitted;
    }

    await this.groups.addMember(group.id, {
      ...input.partner,
      role: "member",
    });

    return admitted;
  }
}

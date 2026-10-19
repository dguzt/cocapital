import { Group } from "@/backend/modules/groups/domain/group";
import { InviteCode } from "@/backend/modules/groups/domain/invite-code";
import type { Member } from "@/backend/modules/groups/domain/member";
import type { Groups } from "./groups.table";
import type { Memberships } from "./memberships.table";

type GroupRow = typeof Groups.$inferSelect;

/** A membership row joined with the partner's name. */
export type MemberRow = Member & {
  groupId: string;
};

/** Translates between the group tables and the Group entity. */
export class GroupMapper {
  /**
   * Builds the entity from the rows that store it.
   *
   * @param group - The row of the groups table.
   * @param members - Memberships of any groups; only this group's are kept.
   * @returns The group as the domain knows it.
   */
  static toDomain(group: GroupRow, members: MemberRow[]): Group {
    return Group.restore({
      id: group.id,
      name: group.name,
      inviteCode: InviteCode.from(group.inviteCode),
      members: members
        .filter((member) => member.groupId === group.id)
        .map(({ userId, name, role }) => ({ userId, name, role })),
    });
  }

  /**
   * Builds the row that stores a group.
   *
   * @param group - The entity to store.
   * @returns The values for an insert into the groups table.
   */
  static toRow(group: Group): typeof Groups.$inferInsert {
    return {
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode.value,
    };
  }

  /**
   * Builds the row that stores a seat.
   *
   * @param groupId - The group the seat belongs to.
   * @param member - The partner and their role.
   * @returns The values for an insert into the memberships table.
   */
  static toMembershipRow(
    groupId: string,
    member: Member,
  ): typeof Memberships.$inferInsert {
    return {
      groupId,
      userId: member.userId,
      role: member.role,
    };
  }
}

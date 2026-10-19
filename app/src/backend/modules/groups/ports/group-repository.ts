import type { Group } from "@/backend/modules/groups/domain/group";
import type { InviteCode } from "@/backend/modules/groups/domain/invite-code";
import type { Member } from "@/backend/modules/groups/domain/member";

/** Storage of groups and their members. */
export interface GroupRepository {
  /**
   * Lists the groups a partner belongs to.
   *
   * @param userId - The partner.
   * @returns Every group of the partner, or an empty list.
   */
  groupsOf(userId: string): Promise<Group[]>;

  /**
   * Finds the group behind an invite code.
   *
   * @param code - The invite code, already normalized.
   * @returns The group, or null when no group uses that code.
   */
  findByInviteCode(code: InviteCode): Promise<Group | null>;

  /**
   * Stores a new group together with its founding member, both or neither.
   *
   * @param group - A group just founded with `Group.create`.
   */
  create(group: Group): Promise<void>;

  /**
   * Stores a new seat in an existing group.
   *
   * @param groupId - The group that admits the partner.
   * @param member - The partner and the seat they take.
   */
  addMember(groupId: string, member: Member): Promise<void>;
}

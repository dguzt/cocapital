import { err, ok, type Result } from "@/lib/result";
import type { GroupError } from "./group-error";
import type { GroupSnapshot } from "./group-snapshot";
import { InviteCode } from "./invite-code";
import type { Member } from "./member";
import type { Partner } from "./partner";

/** A shared capital pot and the partners who run it. */
export class Group {
  static readonly CAPACITY = 2;

  private static readonly MAX_NAME_LENGTH = 40;

  private constructor(
    readonly id: string,
    readonly name: string,
    readonly inviteCode: InviteCode,
    readonly members: readonly Member[],
  ) {}

  /**
   * Founds a group with its creator as the first member.
   *
   * @param rawName - The group name as typed in the form.
   * @param creator - The partner who founds the group.
   * @returns The group with a fresh id and invite code, or
   *   `InvalidGroupName` when the name is blank or longer than 40 characters.
   */
  static create(rawName: string, creator: Partner): Result<Group, GroupError> {
    const name = rawName.trim();

    if (name.length === 0 || name.length > Group.MAX_NAME_LENGTH) {
      return err({
        kind: "InvalidGroupName",
        message: `group name must be 1-${Group.MAX_NAME_LENGTH} characters`,
      });
    }

    const group = new Group(crypto.randomUUID(), name, InviteCode.generate(), [
      { ...creator, role: "creator" },
    ]);

    return ok(group);
  }

  /**
   * Rebuilds a group that already exists, without re-checking its rules.
   *
   * @param snapshot - Every field of the group, already valid.
   * @returns The same group, ready to receive commands.
   */
  static restore(snapshot: GroupSnapshot): Group {
    return new Group(
      snapshot.id,
      snapshot.name,
      snapshot.inviteCode,
      snapshot.members,
    );
  }

  /**
   * Tells whether a partner already sits in this group.
   *
   * @param userId - The partner to look for.
   * @returns True when the partner is a member.
   */
  hasMember(userId: string): boolean {
    return this.members.some((member) => member.userId === userId);
  }

  /**
   * Tells whether another partner can still join.
   *
   * @returns True while the group has fewer members than its capacity.
   */
  hasFreeSeat(): boolean {
    return this.members.length < Group.CAPACITY;
  }

  /**
   * Gives a partner the next free seat.
   *
   * @param partner - The partner who joins.
   * @returns A new group that includes the partner, or `GroupFull` when
   *   every seat is taken. This group is left unchanged.
   */
  admit(partner: Partner): Result<Group, GroupError> {
    if (!this.hasFreeSeat()) {
      return err({
        kind: "GroupFull",
        message: "this group has no seat left",
        groupId: this.id,
      });
    }

    const members: Member[] = [...this.members, { ...partner, role: "member" }];

    return ok(new Group(this.id, this.name, this.inviteCode, members));
  }
}

import type { Group } from "@/backend/modules/groups/domain/group";
import type { InviteCode } from "@/backend/modules/groups/domain/invite-code";
import type { Member } from "@/backend/modules/groups/domain/member";
import type { GroupRepository } from "@/backend/modules/groups/ports/group-repository";

/** A GroupRepository kept in memory, recording the seats it was asked to add. */
export class InMemoryGroups implements GroupRepository {
  readonly stored: Group[] = [];

  readonly addedSeats: { groupId: string; member: Member }[] = [];

  async groupsOf(userId: string) {
    return this.stored.filter((group) => group.hasMember(userId));
  }

  async findByInviteCode(code: InviteCode) {
    return (
      this.stored.find((group) => group.inviteCode.value === code.value) ?? null
    );
  }

  async create(group: Group) {
    this.stored.push(group);
  }

  async addMember(groupId: string, member: Member) {
    this.addedSeats.push({ groupId, member });
  }
}

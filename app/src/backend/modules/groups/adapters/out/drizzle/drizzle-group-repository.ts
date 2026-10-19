import { asc, eq, inArray } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import { Users } from "@/backend/modules/accounts/adapters/out/drizzle/users.table";
import type { Group } from "@/backend/modules/groups/domain/group";
import type { InviteCode } from "@/backend/modules/groups/domain/invite-code";
import type { Member } from "@/backend/modules/groups/domain/member";
import type { GroupRepository } from "@/backend/modules/groups/ports/group-repository";
import { GroupMapper, type MemberRow } from "./group-mapper";
import { Groups } from "./groups.table";
import { Memberships } from "./memberships.table";

export class DrizzleGroupRepository implements GroupRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async groupsOf(userId: string): Promise<Group[]> {
    const groupIds = this.db
      .select({ id: Memberships.groupId })
      .from(Memberships)
      .where(eq(Memberships.userId, userId));

    const rows = await this.db
      .select()
      .from(Groups)
      .where(inArray(Groups.id, groupIds))
      .orderBy(asc(Groups.createdAt));

    return this.withMembers(rows);
  }

  async findByInviteCode(code: InviteCode): Promise<Group | null> {
    const rows = await this.db
      .select()
      .from(Groups)
      .where(eq(Groups.inviteCode, code.value))
      .limit(1);

    const [group] = await this.withMembers(rows);

    return group ?? null;
  }

  async create(group: Group): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(Groups).values(GroupMapper.toRow(group));

      await tx
        .insert(Memberships)
        .values(
          group.members.map((member) =>
            GroupMapper.toMembershipRow(group.id, member),
          ),
        );
    });
  }

  async addMember(groupId: string, member: Member): Promise<void> {
    await this.db
      .insert(Memberships)
      .values(GroupMapper.toMembershipRow(groupId, member));
  }

  private async withMembers(
    rows: (typeof Groups.$inferSelect)[],
  ): Promise<Group[]> {
    if (rows.length === 0) {
      return [];
    }

    const members: MemberRow[] = await this.db
      .select({
        groupId: Memberships.groupId,
        userId: Memberships.userId,
        name: Users.name,
        role: Memberships.role,
      })
      .from(Memberships)
      .innerJoin(Users, eq(Users.id, Memberships.userId))
      .where(
        inArray(
          Memberships.groupId,
          rows.map((row) => row.id),
        ),
      )
      .orderBy(asc(Memberships.joinedAt));

    return rows.map((row) => GroupMapper.toDomain(row, members));
  }
}

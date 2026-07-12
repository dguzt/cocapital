/**
 * M2 data layer — testable with a real DB and an explicit userId
 * (no auth dependency; the actions layer supplies the user).
 */
import { count, eq } from "drizzle-orm";
import { err, ok, type Result } from "@/lib/result";
import { db } from "../../infra/db/client";
import { Groups, Memberships, Users } from "../../infra/db/schema";
import type { GroupError } from "./domain/errors";
import { decideJoin, makeInviteCode, validateGroupName } from "./domain/rules";

export type GroupWithMembers = {
  id: string;
  name: string;
  inviteCode: string;
  members: { id: string; name: string; role: string }[];
};

/** The user's group with members, or null (MVP: at most one group). */
export async function findGroupOf(
  userId: string,
): Promise<GroupWithMembers | null> {
  const [membership] = await db
    .select({ groupId: Memberships.groupId })
    .from(Memberships)
    .where(eq(Memberships.userId, userId));
  if (!membership) return null;

  const [group] = await db
    .select()
    .from(Groups)
    .where(eq(Groups.id, membership.groupId));
  if (!group) return null;

  const members = await db
    .select({ id: Users.id, name: Users.name, role: Memberships.role })
    .from(Memberships)
    .innerJoin(Users, eq(Users.id, Memberships.userId))
    .where(eq(Memberships.groupId, group.id));

  return { ...group, members };
}

/** UC-102: create a group + creator membership, atomically. */
export async function createGroup(
  userId: string,
  rawName: string,
): Promise<Result<GroupWithMembers, GroupError>> {
  const name = validateGroupName(rawName);
  if (!name.ok) return name;

  if (await findGroupOf(userId)) {
    return err({
      kind: "AlreadyInGroup",
      message: "user already belongs to a group",
      groupId: "",
    });
  }

  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const inviteCode = makeInviteCode(bytes);

  // Group + creator membership must land together. neon-http has no
  // interactive transactions → client-generated id + atomic batch.
  const groupId = crypto.randomUUID();
  await db.batch([
    db.insert(Groups).values({ id: groupId, name: name.value, inviteCode }),
    db.insert(Memberships).values({ groupId, userId, role: "creator" }),
  ]);

  return ok((await findGroupOf(userId)) as GroupWithMembers);
}

/** UC-103: join via invite code; closes at 2/2; idempotent for members. */
export async function joinGroup(
  userId: string,
  code: string,
): Promise<Result<GroupWithMembers, GroupError>> {
  const [group] = await db
    .select()
    .from(Groups)
    .where(eq(Groups.inviteCode, code));

  const [current, isMemberRow] = await Promise.all([
    findGroupOf(userId),
    group
      ? db
          .select({ n: count() })
          .from(Memberships)
          .where(eq(Memberships.groupId, group.id))
      : Promise.resolve([{ n: 0 }]),
  ]);

  const decision = decideJoin({
    group: group ?? null,
    code,
    memberCount: isMemberRow[0].n,
    isMember: current?.id === group?.id,
    memberOfOtherGroup: current !== null && current.id !== group?.id,
  });
  if (!decision.ok) return decision;

  if (decision.value.action === "join") {
    await db.insert(Memberships).values({ groupId: group.id, userId });
  }
  return ok((await findGroupOf(userId)) as GroupWithMembers);
}

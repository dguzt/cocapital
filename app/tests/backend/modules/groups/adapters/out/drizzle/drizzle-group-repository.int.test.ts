import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/backend/infra/db/client";
import { Users } from "@/backend/infra/db/schema";
import { DrizzleGroupRepository } from "@/backend/modules/groups/adapters/out/drizzle/drizzle-group-repository";
import { Group } from "@/backend/modules/groups/domain/group";
import { InviteCode } from "@/backend/modules/groups/domain/invite-code";
import { truncateAll } from "@/test/truncate";

const repository = new DrizzleGroupRepository(db);

async function seedPartner(name: string) {
  const [row] = await db
    .insert(Users)
    .values({
      clerkId: `clerk_${name}`,
      name,
      email: `${name.toLowerCase()}@test.pe`,
    })
    .returning();

  return { userId: row.id, name: row.name };
}

function founded(name: string, creator: { userId: string; name: string }) {
  const result = Group.create(name, creator);

  if (!result.ok) {
    throw new Error("seed failed");
  }

  return result.value;
}

beforeEach(truncateAll);

describe("DrizzleGroupRepository", () => {
  it("stores a group with its creator and reads it back for that partner", async () => {
    const diego = await seedPartner("Diego");

    const group = founded("Inversiones DR", diego);

    await repository.create(group);

    expect(await repository.groupsOf(diego.userId)).toEqual([group]);
  });

  it("finds a group by its invite code and adds a seat", async () => {
    const diego = await seedPartner("Diego");

    const rosa = await seedPartner("Rosa");

    const group = founded("Inversiones DR", diego);

    await repository.create(group);

    await repository.addMember(group.id, { ...rosa, role: "member" });

    const found = await repository.findByInviteCode(
      InviteCode.from(group.inviteCode.value.toLowerCase()),
    );

    expect(found?.members).toEqual([
      { ...diego, role: "creator" },
      { ...rosa, role: "member" },
    ]);
    expect(await repository.groupsOf(rosa.userId)).toHaveLength(1);
  });

  it("answers empty or null when nothing matches", async () => {
    const rosa = await seedPartner("Rosa");

    expect(await repository.groupsOf(rosa.userId)).toEqual([]);
    expect(await repository.findByInviteCode(InviteCode.from("ZZZZZZZZ"))).toBe(
      null,
    );
  });
});

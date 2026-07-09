/** E1 integration: group create/join against the real test branch. */
import { beforeEach, describe, expect, it } from "vitest";
import { truncateAll } from "@/test/truncate";
import { db } from "../../infra/db/client";
import { users } from "../../infra/db/schema";
import { createGroup, findGroupOf, joinGroup } from "./data";

async function mkUser(clerkId: string, name: string) {
  const [u] = await db
    .insert(users)
    .values({ clerkId, name, email: `${name.toLowerCase()}@test.pe` })
    .returning();
  return u;
}

beforeEach(truncateAll);

describe("E1: create → invite → join → full", () => {
  it("runs the whole onboarding flow", async () => {
    const diego = await mkUser("clerk_diego", "Diego");
    const rosa = await mkUser("clerk_rosa", "Rosa");

    // UC-102: Diego creates the group
    const created = await createGroup(diego.id, "  Amigos  ");
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.value.name).toBe("Amigos"); // trimmed
    expect(created.value.inviteCode).toMatch(/^[A-Z2-9]{8}$/);
    expect(created.value.members.map((m) => m.role)).toEqual(["creator"]);

    // UC-103: Rosa joins via the code
    const joined = await joinGroup(rosa.id, created.value.inviteCode);
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    expect(joined.value.members).toHaveLength(2);

    // Link is now dead: a third user gets GroupFull
    const intruder = await mkUser("clerk_x", "X");
    const third = await joinGroup(intruder.id, created.value.inviteCode);
    expect(!third.ok && third.error.kind === "GroupFull").toBe(true);

    // Rosa re-opens the link → idempotent, still her group
    const again = await joinGroup(rosa.id, created.value.inviteCode);
    expect(again.ok && again.value.members.length === 2).toBe(true);

    // Both see the same group
    expect((await findGroupOf(diego.id))?.id).toBe(created.value.id);
    expect((await findGroupOf(rosa.id))?.id).toBe(created.value.id);
  });

  it("rejects a second group for the same user", async () => {
    const diego = await mkUser("clerk_diego", "Diego");
    await createGroup(diego.id, "Amigos");
    const second = await createGroup(diego.id, "Otro");
    expect(!second.ok && second.error.kind === "AlreadyInGroup").toBe(true);
  });

  it("unknown invite code → InviteNotFound", async () => {
    const rosa = await mkUser("clerk_rosa", "Rosa");
    const r = await joinGroup(rosa.id, "ZZZZZZZZ");
    expect(!r.ok && r.error.kind === "InviteNotFound").toBe(true);
  });
});

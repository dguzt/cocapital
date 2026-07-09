/**
 * DB-level invariants — things only the real database can prove:
 * constraint enforcement, the one-pending partial index, batch atomicity.
 * Runs against the isolated Neon "test" branch (see integration-setup.ts).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "./client";
import {
  groups,
  memberships,
  movementChanges,
  movements,
  users,
} from "./schema";

/** Drizzle wraps pg errors ("Failed query: …") — the real code/message is in
 *  the cause chain. Asserts a promise rejects with a unique violation. */
async function expectUniqueViolation(p: Promise<unknown>) {
  try {
    await p;
    throw new Error("expected a unique-violation rejection, but it resolved");
  } catch (e) {
    let msg = "";
    for (let err = e as Error | undefined; err; err = err.cause as Error) {
      msg += ` ${err.message ?? ""}`;
    }
    expect(msg).toMatch(/duplicate key|23505/);
  }
}

/** Order matters: children before parents (FKs). */
async function truncateAll() {
  await db.delete(movementChanges);
  await db.delete(movements);
  await db.delete(memberships);
  await db.delete(groups);
  await db.delete(users);
}

async function seedUserAndGroup() {
  const [user] = await db
    .insert(users)
    .values({ clerkId: "clerk_test_a", name: "Ana", email: "a@test.pe" })
    .returning();
  const [group] = await db
    .insert(groups)
    .values({ name: "Amigos", inviteCode: "TESTCODE01" })
    .returning();
  return { user, group };
}

beforeEach(truncateAll);

describe("constraints", () => {
  it("clerk_id is unique", async () => {
    const row = { clerkId: "clerk_x", name: "A", email: "a@t.pe" };
    await db.insert(users).values(row);
    await expectUniqueViolation(db.insert(users).values(row));
  });

  it("membership primary key stops double-join", async () => {
    const { user, group } = await seedUserAndGroup();
    const m = { groupId: group.id, userId: user.id };
    await db.insert(memberships).values(m);
    await expectUniqueViolation(db.insert(memberships).values(m));
  });
});

describe("one pending change per movement (partial unique index)", () => {
  it("second PENDING change is rejected; decided ones don't block", async () => {
    const { user, group } = await seedUserAndGroup();
    const [mov] = await db
      .insert(movements)
      .values({
        groupId: group.id,
        userId: user.id,
        type: "contribute",
        amount: 5000,
        date: "2026-07-09",
      })
      .returning();

    const change = {
      movementId: mov.id,
      kind: "edit" as const,
      proposedBy: user.id,
      before: { amount: 5000 },
      after: { amount: 4500 },
    };
    await db.insert(movementChanges).values(change);
    // Same movement, second undecided change → DB says no.
    await expectUniqueViolation(db.insert(movementChanges).values(change));
    // Decide the first → a new pending change is allowed again.
    await db.update(movementChanges).set({ status: "rejected" });
    await expect(
      db.insert(movementChanges).values(change),
    ).resolves.toBeTruthy();
  });
});

describe("batch atomicity (neon-http regression of the tx experiment)", () => {
  it("a failing statement rolls back the whole batch", async () => {
    const dup = { clerkId: "clerk_dup", name: "D", email: "d@t.pe" };
    await expectUniqueViolation(
      db.batch([db.insert(users).values(dup), db.insert(users).values(dup)]),
    );
    const rows = await db.select().from(users);
    expect(rows).toHaveLength(0); // first insert rolled back too
  });

  it("a valid batch commits everything", async () => {
    await db.batch([
      db.insert(users).values({ clerkId: "c1", name: "A", email: "a@t.pe" }),
      db.insert(users).values({ clerkId: "c2", name: "B", email: "b@t.pe" }),
    ]);
    expect(await db.select().from(users)).toHaveLength(2);
  });
});

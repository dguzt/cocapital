/**
 * DB-level invariants — things only the real database can prove:
 * constraint enforcement, the one-pending partial index, batch atomicity.
 * Runs against the isolated Neon "test" branch (see integration-setup.ts).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import {
  Groups,
  Memberships,
  MovementChanges,
  Movements,
  Users,
} from "@/backend/infra/db/schema";
import { truncateAll } from "@/test/truncate";

/** Flatten an error's cause chain into one searchable string, immutably. */
function causeChain(e: unknown): string {
  const messages = (err: unknown): string[] =>
    err instanceof Error ? [err.message, ...messages(err.cause)] : [];
  return messages(e).join(" ");
}

/** Drizzle wraps pg errors ("Failed query: …") — the real code/message is in
 *  the cause chain. Asserts a promise rejects with a unique violation. */
async function expectUniqueViolation(p: Promise<unknown>) {
  try {
    await p;
    throw new Error("expected a unique-violation rejection, but it resolved");
  } catch (e) {
    expect(causeChain(e)).toMatch(/duplicate key|23505/);
  }
}

async function seedUserAndGroup() {
  const [user] = await db
    .insert(Users)
    .values({ clerkId: "clerk_test_a", name: "Ana", email: "a@test.pe" })
    .returning();
  const [group] = await db
    .insert(Groups)
    .values({ name: "Inversiones DR", inviteCode: "TESTCODE01" })
    .returning();
  return { user, group };
}

beforeEach(truncateAll);

describe("constraints", () => {
  it("clerk_id is unique", async () => {
    const row = { clerkId: "clerk_x", name: "A", email: "a@t.pe" };
    await db.insert(Users).values(row);
    await expectUniqueViolation(db.insert(Users).values(row));
  });

  it("membership primary key stops double-join", async () => {
    const { user, group } = await seedUserAndGroup();
    const m = { groupId: group.id, userId: user.id };
    await db.insert(Memberships).values(m);
    await expectUniqueViolation(db.insert(Memberships).values(m));
  });
});

describe("one pending change per movement (partial unique index)", () => {
  it("second PENDING change is rejected; decided ones don't block", async () => {
    const { user, group } = await seedUserAndGroup();
    const [mov] = await db
      .insert(Movements)
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
    await db.insert(MovementChanges).values(change);
    // Same movement, second undecided change → DB says no.
    await expectUniqueViolation(db.insert(MovementChanges).values(change));
    // Decide the first → a new pending change is allowed again.
    await db.update(MovementChanges).set({ status: "rejected" });
    await expect(
      db.insert(MovementChanges).values(change),
    ).resolves.toBeTruthy();
  });
});

describe("batch atomicity (neon-http regression of the tx experiment)", () => {
  it("a failing statement rolls back the whole batch", async () => {
    const dup = { clerkId: "clerk_dup", name: "D", email: "d@t.pe" };
    await expectUniqueViolation(
      db.batch([db.insert(Users).values(dup), db.insert(Users).values(dup)]),
    );
    const rows = await db.select().from(Users);
    expect(rows).toHaveLength(0); // first insert rolled back too
  });

  it("a valid batch commits everything", async () => {
    await db.batch([
      db.insert(Users).values({ clerkId: "c1", name: "A", email: "a@t.pe" }),
      db.insert(Users).values({ clerkId: "c2", name: "B", email: "b@t.pe" }),
    ]);
    expect(await db.select().from(Users)).toHaveLength(2);
  });
});

/**
 * DB-level invariants — things only the real database can prove:
 * constraint enforcement, the one-pending partial index, transactions.
 * Runs against the isolated Neon "test" branch (see integration-setup.ts).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import { DrizzleUnitOfWork } from "@/backend/infra/db/drizzle-unit-of-work";
import {
  Groups,
  Memberships,
  MovementChanges,
  Movements,
  Users,
} from "@/backend/infra/db/schema";
import { err, ok } from "@/lib/result";
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

describe("DrizzleUnitOfWork", () => {
  const uow = new DrizzleUnitOfWork(db);

  const ana = { clerkId: "c1", name: "A", email: "a@t.pe" };

  const bruno = { clerkId: "c2", name: "B", email: "b@t.pe" };

  it("commits every write when the work returns ok", async () => {
    await uow.run(async () => {
      await db.insert(Users).values(ana);

      await db.insert(Users).values(bruno);

      return ok(true);
    });

    expect(await db.select().from(Users)).toHaveLength(2);
  });

  it("rolls every write back when the work returns an error", async () => {
    const result = await uow.run(async () => {
      await db.insert(Users).values(ana);

      return err({ kind: "Nope", message: "changed my mind" });
    });

    expect(result.ok).toBe(false);
    expect(await db.select().from(Users)).toHaveLength(0);
  });

  it("rolls every write back when a statement fails", async () => {
    await expectUniqueViolation(
      uow.run(async () => {
        await db.insert(Users).values(ana);

        await db.insert(Users).values(ana);

        return ok(true);
      }),
    );

    expect(await db.select().from(Users)).toHaveLength(0);
  });

  it("joins a unit already running instead of committing on its own", async () => {
    await uow.run(async () => {
      await uow.run(async () => {
        await db.insert(Users).values(ana);

        return ok(true);
      });

      return err({ kind: "Nope", message: "outer unit fails" });
    });

    expect(await db.select().from(Users)).toHaveLength(0);
  });
});

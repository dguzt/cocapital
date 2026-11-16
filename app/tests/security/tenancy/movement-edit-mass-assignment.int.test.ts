/**
 * proposeEditAction builds the edit from the `before` snapshot the browser
 * sends, and the ledger writes every key of it that names a column. A partner
 * must never be able to move a movement into another group, sign it as
 * another partner, or turn it into a type the ledger form refuses.
 */

import { proposeEditOverTheWire } from "@tests/security/support/over-the-wire";

import { seedTenants } from "@tests/security/tenancy/support/seed";
import { NOT_FOUND, signInAs } from "@tests/security/tenancy/support/session";
import {
  decideMovementChange,
  listMovements,
  listPendingChanges,
} from "@tests/support/use-cases";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Movements } from "@/backend/infra/db/schema";
import type { MovementSnapshot } from "@/backend/modules/movements/domain/movement";
import { truncateAll } from "@/test/truncate";

vi.mock("@clerk/nextjs/server", async () => {
  const { fakeAuth } = await import("@tests/security/tenancy/support/session");

  return {
    auth: fakeAuth,
    clerkClient: async () => {
      throw new Error("Clerk is not reachable from tests");
    },
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(truncateAll);

async function stored(movementId: string) {
  const [row] = await db
    .select()
    .from(Movements)
    .where(eq(Movements.id, movementId));

  return row;
}

function snapshotOf(movement: {
  type: MovementSnapshot["type"];
  amount: number;
  cost: number | null;
  concept: string | null;
  date: string;
}): MovementSnapshot {
  return {
    type: movement.type,
    amount: movement.amount,
    cost: movement.cost,
    concept: movement.concept,
    date: movement.date,
  };
}

describe("proposeEditAction trusts only amount, concept and cost", () => {
  it("a partner alone in group A cannot move a movement into group B", async () => {
    const t = await seedTenants();
    signInAs("clerk_ana");

    const forged = {
      ...snapshotOf(t.movementA),
      groupId: t.groupB.id,
    } as MovementSnapshot;

    const result = await proposeEditOverTheWire(
      t.groupA.id,
      t.movementA.id,
      { amountSoles: "999999", concept: "injected" },
      forged,
    );

    expect(result.ok).toBe(true);

    const ledgerB = await listMovements(t.groupB.id);

    expect(ledgerB.map((row) => row.id)).not.toContain(t.movementA.id);

    expect((await stored(t.movementA.id)).groupId).toBe(t.groupA.id);
  });

  it("an approved edit in a shared group cannot move the movement into group B", async () => {
    const t = await seedTenants();
    signInAs("clerk_ana");

    const forged = {
      ...snapshotOf(t.movementA2),
      groupId: t.groupB.id,
    } as MovementSnapshot;

    const proposed = await proposeEditOverTheWire(
      t.groupA2.id,
      t.movementA2.id,
      { amountSoles: "100", concept: "typo fix" },
      forged,
    );

    expect(proposed.ok).toBe(true);

    const changes = await listPendingChanges(t.groupA2.id);

    await decideMovementChange(
      t.groupA2.id,
      t.rosa.id,
      changes[0].id,
      "approve",
    );

    expect((await stored(t.movementA2.id)).groupId).toBe(t.groupA2.id);
  });

  it("a partner cannot sign an edited movement as another partner", async () => {
    const t = await seedTenants();
    signInAs("clerk_ana");

    const forged = {
      ...snapshotOf(t.movementA),
      userId: t.bea.id,
    } as MovementSnapshot;

    await proposeEditOverTheWire(
      t.groupA.id,
      t.movementA.id,
      { amountSoles: "100", concept: "signed by someone else" },
      forged,
    );

    expect((await stored(t.movementA.id)).userId).toBe(t.ana.id);
  });

  it("a partner cannot turn a manual movement into a type the form refuses", async () => {
    const t = await seedTenants();
    signInAs("clerk_ana");

    const forged = { ...snapshotOf(t.movementA), type: "lend" } as const;

    await proposeEditOverTheWire(
      t.groupA.id,
      t.movementA.id,
      { amountSoles: "100", concept: "now a lend" },
      forged,
    );

    expect((await stored(t.movementA.id)).type).toBe("contribute");
  });

  it("a non-member is still stopped before any edit", async () => {
    const t = await seedTenants();
    signInAs("clerk_ana");

    await expect(
      proposeEditOverTheWire(
        t.groupB.id,
        t.b.movement.id,
        { amountSoles: "1", concept: "x" },
        snapshotOf(t.b.movement),
      ),
    ).rejects.toMatchObject(NOT_FOUND);
  });
});

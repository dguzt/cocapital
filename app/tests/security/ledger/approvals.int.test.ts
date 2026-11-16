import {
  movementRow,
  seedGroup,
  seedMovement,
  seedUser,
  TODAY,
} from "@tests/security/ledger/seed";
import {
  decideMovementChange,
  listMovementHistory,
  proposeMovementChange,
} from "@tests/support/use-cases";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/backend/infra/db/client";
import { MovementChanges } from "@/backend/infra/db/schema";
import { DrizzleMovementRepository } from "@/backend/modules/movements/adapters/out/drizzle/drizzle-movement-repository";
import { truncateAll } from "@/test/truncate";

beforeEach(truncateAll);

async function trio() {
  const ana = await seedUser("Ana");

  const rosa = await seedUser("Rosa");

  const luis = await seedUser("Luis");

  const group = await seedGroup(ana, rosa, luis);

  const movement = await seedMovement(group.id, ana.id, "contribute", "50");

  return { ana, rosa, luis, group, movement };
}

async function pendingVoid(
  groupId: string,
  actorId: string,
  movementId: string,
) {
  const proposed = await proposeMovementChange(
    groupId,
    actorId,
    movementId,
    "void",
  );

  if (!proposed.ok) {
    throw new Error(`propose failed: ${proposed.error.kind}`);
  }

  return proposed.value.pendingId;
}

function crashNextEdit() {
  vi.spyOn(
    DrizzleMovementRepository.prototype,
    "applyEdit",
  ).mockRejectedValueOnce(new Error("simulated crash while applying the edit"));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("decision rules (sequential)", () => {
  it("the proposer can never approve their own change", async () => {
    const { ana, group, movement } = await trio();

    const pendingId = await pendingVoid(group.id, ana.id, movement.id);

    const self = await decideMovementChange(
      group.id,
      ana.id,
      pendingId,
      "approve",
    );

    expect(!self.ok && self.error.kind).toBe("SelfApproval");

    expect((await movementRow(movement.id)).status).toBe("active");
  });

  it("a change cannot be approved twice", async () => {
    const { ana, rosa, luis, group, movement } = await trio();

    const pendingId = await pendingVoid(group.id, ana.id, movement.id);

    await decideMovementChange(group.id, rosa.id, pendingId, "approve");

    const again = await decideMovementChange(
      group.id,
      luis.id,
      pendingId,
      "approve",
    );

    expect(!again.ok && again.error.kind).toBe("AlreadyDecided");
  });

  it("a rejected change cannot be approved afterwards", async () => {
    const { ana, rosa, luis, group, movement } = await trio();

    const pendingId = await pendingVoid(group.id, ana.id, movement.id);

    await decideMovementChange(group.id, rosa.id, pendingId, "reject");

    const late = await decideMovementChange(
      group.id,
      luis.id,
      pendingId,
      "approve",
    );

    expect(!late.ok && late.error.kind).toBe("AlreadyDecided");

    expect((await movementRow(movement.id)).status).toBe("active");
  });

  it("a voided movement cannot be voided again", async () => {
    const { ana, rosa, group, movement } = await trio();

    const pendingId = await pendingVoid(group.id, ana.id, movement.id);

    await decideMovementChange(group.id, rosa.id, pendingId, "approve");

    const twice = await proposeMovementChange(
      group.id,
      ana.id,
      movement.id,
      "void",
    );

    expect(!twice.ok && twice.error.kind).toBe("MovementVoided");
  });

  it("a change of another group cannot be decided from your own group", async () => {
    const { ana, group, movement } = await trio();

    const mallory = await seedUser("Mallory");

    const own = await seedGroup(mallory);

    const pendingId = await pendingVoid(group.id, ana.id, movement.id);

    const crossed = await decideMovementChange(
      own.id,
      mallory.id,
      pendingId,
      "approve",
    );

    expect(!crossed.ok && crossed.error.kind).toBe("ChangeNotFound");
  });
});

describe("decision races (concurrent)", () => {
  it("two partners approving the same change at once: only one decision wins", async () => {
    const { ana, rosa, luis, group, movement } = await trio();

    const pendingId = await pendingVoid(group.id, ana.id, movement.id);

    const results = await Promise.all([
      decideMovementChange(group.id, rosa.id, pendingId, "approve"),
      decideMovementChange(group.id, luis.id, pendingId, "approve"),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });

  it("approve and reject at once: the stored status matches what was applied", async () => {
    const failures: string[] = [];

    for (let round = 0; round < 5; round++) {
      await truncateAll();

      const { ana, rosa, luis, group, movement } = await trio();

      const pendingId = await pendingVoid(group.id, ana.id, movement.id);

      const [approve, reject] = await Promise.all([
        decideMovementChange(group.id, rosa.id, pendingId, "approve"),
        decideMovementChange(group.id, luis.id, pendingId, "reject"),
      ]);

      const [change] = await db
        .select()
        .from(MovementChanges)
        .where(eq(MovementChanges.id, pendingId));

      const voided = (await movementRow(movement.id)).status === "voided";

      const bothSucceeded = approve.ok && reject.ok;

      const inconsistent =
        (voided && change.status !== "approved") ||
        (!voided && change.status === "approved");

      if (bothSucceeded || inconsistent) {
        failures.push(
          `round ${round}: approve.ok=${approve.ok} reject.ok=${reject.ok} status=${change.status} voided=${voided}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it("two void proposals at once: one opens, the other is refused cleanly (no throw)", async () => {
    const { ana, rosa, group, movement } = await trio();

    const results = await Promise.allSettled([
      proposeMovementChange(group.id, ana.id, movement.id, "void"),
      proposeMovementChange(group.id, rosa.id, movement.id, "void"),
    ]);

    expect(results.map((result) => result.status)).toEqual([
      "fulfilled",
      "fulfilled",
    ]);
  });

  it("alone: two voids at once are applied and recorded only once", async () => {
    const solo = await seedUser("Solo");

    const group = await seedGroup(solo);

    const movement = await seedMovement(group.id, solo.id, "contribute", "50");

    await Promise.allSettled([
      proposeMovementChange(
        group.id,
        solo.id,
        movement.id,
        "void",
        undefined,
        true,
      ),
      proposeMovementChange(
        group.id,
        solo.id,
        movement.id,
        "void",
        undefined,
        true,
      ),
    ]);

    const history = await listMovementHistory(group.id, movement.id);

    expect(history.filter((item) => item.status === "approved")).toHaveLength(
      1,
    );
  });

  it("alone: an edit and a void at once never leave a voided movement edited", async () => {
    const solo = await seedUser("Solo");

    const group = await seedGroup(solo);

    const movement = await seedMovement(group.id, solo.id, "contribute", "50");

    await Promise.allSettled([
      proposeMovementChange(
        group.id,
        solo.id,
        movement.id,
        "edit",
        {
          type: "contribute",
          amount: 999900,
          cost: null,
          concept: null,
          date: TODAY,
        },
        true,
      ),
      proposeMovementChange(
        group.id,
        solo.id,
        movement.id,
        "void",
        undefined,
        true,
      ),
    ]);

    const history = await listMovementHistory(group.id, movement.id);

    expect(history.filter((item) => item.status === "approved")).toHaveLength(
      1,
    );
  });
});

describe("atomicity of decisions", () => {
  it("an approval whose apply crashes leaves the change pending and the movement untouched", async () => {
    const { ana, rosa, group, movement } = await trio();

    const proposed = await proposeMovementChange(
      group.id,
      ana.id,
      movement.id,
      "edit",
      {
        type: "contribute",
        amount: 4500,
        cost: null,
        concept: null,
        date: TODAY,
      },
    );

    if (!proposed.ok) throw new Error("propose failed");

    crashNextEdit();

    await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    ).catch(() => null);

    const [change] = await db
      .select()
      .from(MovementChanges)
      .where(eq(MovementChanges.id, proposed.value.pendingId));

    expect(change.status).toBe("pending");

    expect((await movementRow(movement.id)).amount).toBe(5000);
  });

  it("alone: a proposal whose apply crashes leaves no change recorded", async () => {
    const solo = await seedUser("Solo");

    const group = await seedGroup(solo);

    const movement = await seedMovement(group.id, solo.id, "contribute", "50");

    crashNextEdit();

    await proposeMovementChange(
      group.id,
      solo.id,
      movement.id,
      "edit",
      {
        type: "contribute",
        amount: 4500,
        cost: null,
        concept: null,
        date: TODAY,
      },
      true,
    ).catch(() => null);

    expect(await listMovementHistory(group.id, movement.id)).toHaveLength(0);

    expect((await movementRow(movement.id)).amount).toBe(5000);
  });
});

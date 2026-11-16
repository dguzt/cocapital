import {
  movementRow,
  seedGroup,
  seedMovement,
  seedUser,
  TODAY,
} from "@tests/security/ledger/seed";
import { proposeEditOverTheWire } from "@tests/security/support/over-the-wire";

import {
  decideMovementChange,
  listMovements,
  listPendingChanges,
  proposeMovementChange,
} from "@tests/support/use-cases";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addMovementAction,
  decideChangeAction,
  proposeVoidAction,
} from "@/backend/modules/movements/adapters/in/next/movement-actions";
import type { MovementSnapshot } from "@/backend/modules/movements/domain/movement";
import { truncateAll } from "@/test/truncate";

const session = vi.hoisted(() => ({ userId: "" }));

vi.mock("@/backend/modules/groups/adapters/in/next/membership", async () => {
  const { useCases } = await import("@/backend/application/container");

  return {
    requireMembership: async (groupId: string) => {
      const group = await useCases.getGroupOf.execute({
        userId: session.userId,
        groupId,
      });

      if (!group) {
        throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
      }

      return { user: { id: session.userId }, group };
    },
    revalidateGroup: () => {},
  };
});

const actAs = (userId: string) => {
  session.userId = userId;
};

beforeEach(truncateAll);

const snapshotOf = (row: Awaited<ReturnType<typeof movementRow>>) =>
  ({
    type: row.type,
    amount: row.amount,
    cost: row.cost,
    concept: row.concept,
    date: row.date,
  }) satisfies MovementSnapshot;

describe("proposeEditAction trusts the client's `before`", () => {
  it("an edit cannot move a movement into another group's ledger", async () => {
    const mallory = await seedUser("Mallory");

    const victim = await seedUser("Victima");

    const own = await seedGroup(mallory);

    const target = await seedGroup(victim);

    const movement = await seedMovement(own.id, mallory.id, "contribute", "50");

    actAs(mallory.id);

    const crafted = {
      ...snapshotOf(await movementRow(movement.id)),
      groupId: target.id,
    } as MovementSnapshot;

    await proposeEditOverTheWire(
      own.id,
      movement.id,
      { amountSoles: "1000000", concept: "" },
      crafted,
    );

    const victimLedger = await listMovements(target.id);

    expect(victimLedger).toHaveLength(0);

    expect((await movementRow(movement.id)).groupId).toBe(own.id);
  });

  it("an edit cannot rewrite the author of a movement", async () => {
    const ana = await seedUser("Ana");

    const rosa = await seedUser("Rosa");

    const group = await seedGroup(ana, rosa);

    const movement = await seedMovement(group.id, rosa.id, "expense", "80");

    actAs(ana.id);

    const crafted = {
      ...snapshotOf(await movementRow(movement.id)),
      userId: ana.id,
    } as MovementSnapshot;

    const proposed = await proposeEditOverTheWire(
      group.id,
      movement.id,
      { amountSoles: "80", concept: "" },
      crafted,
    );

    const [pending] = await listPendingChanges(group.id);

    actAs(rosa.id);

    await decideChangeAction(group.id, pending.id, "approve");

    expect(proposed.ok).toBe(true);

    expect((await movementRow(movement.id)).userId).toBe(rosa.id);
  });

  it("an edit cannot change the movement's type", async () => {
    const solo = await seedUser("Solo");

    const group = await seedGroup(solo);

    const movement = await seedMovement(group.id, solo.id, "expense", "80");

    actAs(solo.id);

    await proposeEditOverTheWire(
      group.id,
      movement.id,
      { amountSoles: "80", concept: "" },
      { ...snapshotOf(await movementRow(movement.id)), type: "contribute" },
    );

    expect((await movementRow(movement.id)).type).toBe("expense");
  });

  it("an edit cannot turn a manual movement into a loan's lend nobody can void", async () => {
    const solo = await seedUser("Solo");

    const group = await seedGroup(solo);

    const movement = await seedMovement(group.id, solo.id, "contribute", "50");

    actAs(solo.id);

    await proposeEditOverTheWire(
      group.id,
      movement.id,
      { amountSoles: "50", concept: "" },
      { ...snapshotOf(await movementRow(movement.id)), type: "lend" },
    );

    const voided = await proposeVoidAction(group.id, movement.id);

    expect(voided.ok).toBe(true);
  });

  it("an edit cannot backdate the movement", async () => {
    const solo = await seedUser("Solo");

    const group = await seedGroup(solo);

    const movement = await seedMovement(group.id, solo.id, "contribute", "50");

    actAs(solo.id);

    await proposeEditOverTheWire(
      group.id,
      movement.id,
      { amountSoles: "50", concept: "" },
      { ...snapshotOf(await movementRow(movement.id)), date: "1900-01-01" },
    );

    expect((await movementRow(movement.id)).date).toBe(TODAY);
  });

  it("an edit proposal stores only the editable fields", async () => {
    const ana = await seedUser("Ana");

    const rosa = await seedUser("Rosa");

    const group = await seedGroup(ana, rosa);

    const movement = await seedMovement(group.id, ana.id, "contribute", "50");

    actAs(ana.id);

    await proposeEditOverTheWire(
      group.id,
      movement.id,
      { amountSoles: "50", concept: "" },
      {
        ...snapshotOf(await movementRow(movement.id)),
        status: "active",
      } as MovementSnapshot,
    );

    const [pending] = await listPendingChanges(group.id);

    const stored = pending.after as unknown as Record<string, unknown>;

    expect(Object.keys(stored).sort()).toEqual(
      ["amount", "concept", "cost", "date", "type"].sort(),
    );
  });

  it("the use case changes only the amount, concept and cost of an edit", async () => {
    const ana = await seedUser("Ana");

    const rosa = await seedUser("Rosa");

    const group = await seedGroup(ana, rosa);

    const movement = await seedMovement(group.id, ana.id, "expense", "80");

    const proposed = await proposeMovementChange(
      group.id,
      ana.id,
      movement.id,
      "edit",
      {
        type: "contribute",
        amount: 8000,
        cost: null,
        concept: null,
        date: "1900-01-01",
      },
    );

    if (!proposed.ok) {
      throw new Error(proposed.error.kind);
    }

    await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    );

    const row = await movementRow(movement.id);

    expect(row.type).toBe("expense");

    expect(row.date).toBe(TODAY);

    expect(row.amount).toBe(8000);
  });
});

describe("addMovementAction input parsing", () => {
  async function solo() {
    const user = await seedUser("Solo");

    const group = await seedGroup(user);

    actAs(user.id);

    return group;
  }

  it.each([
    ["-5"],
    ["0"],
    ["0.004"],
    ["abc"],
    ["NaN"],
    ["Infinity"],
    [""],
    ["   "],
  ])("rejects amount %j as InvalidAmount", async (amountSoles) => {
    const group = await solo();

    const result = await addMovementAction(group.id, {
      type: "contribute",
      amountSoles,
    });

    expect(result).toEqual({ ok: false, error: "InvalidAmount" });
  });

  it.each([
    ["lend"],
    ["repay"],
    ["sell_on_credit"],
    ["collect_sale"],
    ["bogus"],
  ])("rejects type %j as InvalidType", async (type) => {
    const group = await solo();

    const result = await addMovementAction(group.id, {
      type,
      amountSoles: "10",
    });

    expect(result).toEqual({ ok: false, error: "InvalidType" });
  });

  it("rounds sub-cent input to whole cents", async () => {
    const group = await solo();

    await addMovementAction(group.id, {
      type: "contribute",
      amountSoles: "10.555",
    });

    const [movement] = await listMovements(group.id);

    expect(Number.isInteger(movement.amount)).toBe(true);
  });

  it("refuses an amount beyond what the ledger can store, without crashing", async () => {
    const group = await solo();

    const result = await addMovementAction(group.id, {
      type: "contribute",
      amountSoles: "99999999",
    }).catch((error: Error) => ({ thrown: error.message }));

    expect(result).toEqual({ ok: false, error: "InvalidAmount" });
  });

  it("refuses amounts written in hex or exponent notation", async () => {
    const group = await solo();

    const results = await Promise.all(
      ["0x10", "1e3"].map((amountSoles) =>
        addMovementAction(group.id, { type: "contribute", amountSoles }),
      ),
    );

    expect(results).toEqual([
      { ok: false, error: "InvalidAmount" },
      { ok: false, error: "InvalidAmount" },
    ]);
  });

  it("refuses a non-string amount without crashing", async () => {
    const group = await solo();

    const result = await addMovementAction(group.id, {
      type: "contribute",
      amountSoles: { length: 1 } as unknown as string,
    }).catch((error: Error) => ({ thrown: error.message }));

    expect(result).toEqual({ ok: false, error: "InvalidAmount" });
  });

  it("caps the length of a concept", async () => {
    const group = await solo();

    const result = await addMovementAction(group.id, {
      type: "contribute",
      amountSoles: "10",
      concept: "x".repeat(100_000),
    });

    expect(result.ok).toBe(false);
  });
});

describe("decideChangeAction and the alone path", () => {
  it("an unknown decision never approves", async () => {
    const ana = await seedUser("Ana");

    const rosa = await seedUser("Rosa");

    const group = await seedGroup(ana, rosa);

    const movement = await seedMovement(group.id, ana.id, "contribute", "50");

    actAs(ana.id);

    await proposeVoidAction(group.id, movement.id);

    const [pending] = await listPendingChanges(group.id);

    actAs(rosa.id);

    await decideChangeAction(
      group.id,
      pending.id,
      "maybe" as unknown as "approve",
    );

    expect((await movementRow(movement.id)).status).toBe("active");
  });

  it("a partner of a group of two is never treated as alone", async () => {
    const ana = await seedUser("Ana");

    const rosa = await seedUser("Rosa");

    const group = await seedGroup(ana, rosa);

    const movement = await seedMovement(group.id, ana.id, "contribute", "50");

    actAs(ana.id);

    const result = await proposeVoidAction(group.id, movement.id);

    expect(result).toEqual({ ok: true, applied: false });

    expect((await movementRow(movement.id)).status).toBe("active");
  });

  it("a non-member cannot decide a change of the group", async () => {
    const ana = await seedUser("Ana");

    const rosa = await seedUser("Rosa");

    const mallory = await seedUser("Mallory");

    const group = await seedGroup(ana, rosa);

    await seedGroup(mallory);

    const movement = await seedMovement(group.id, ana.id, "contribute", "50");

    actAs(ana.id);

    await proposeVoidAction(group.id, movement.id);

    const [pending] = await listPendingChanges(group.id);

    actAs(mallory.id);

    await expect(
      decideChangeAction(group.id, pending.id, "approve"),
    ).rejects.toThrow();

    const direct = await decideMovementChange(
      group.id,
      ana.id,
      pending.id,
      "approve",
    );

    expect(!direct.ok && direct.error.kind).toBe("SelfApproval");

    expect((await movementRow(movement.id)).status).toBe("active");
  });
});

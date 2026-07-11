/**
 * E4 data layer: pending changes + immutable history over movement_changes.
 * The pure state machine (domain/pending.ts) decides; this executes.
 * Loan movements are system-written by M4: `lend` is untouchable here (correct
 * it from the loan) and `repay` is void-only — voiding one undoes the collection.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import { err, ok, type Result } from "@/lib/result";
import { db } from "../../infra/db/client";
import {
  installments,
  movementChanges,
  movements,
  users,
} from "../../infra/db/schema";
import type { PendingChangeError } from "./domain/errors";
import type { MovementSnapshot } from "./domain/movement";
import {
  type ChangeKind,
  decideChange as decideChangePure,
  proposeChange as proposePure,
} from "./domain/pending";

export type PendingChangeItem = {
  id: string;
  movementId: string;
  kind: ChangeKind;
  proposedBy: string;
  proposerName: string;
  before: MovementSnapshot;
  after: MovementSnapshot | null;
  createdAt: Date;
};

export type ChangeHistoryItem = PendingChangeItem & {
  status: "pending" | "approved" | "rejected";
  deciderName: string | null;
  decidedAt: Date | null;
};

function snapshotOf(m: typeof movements.$inferSelect): MovementSnapshot {
  return {
    type: m.type,
    amount: m.amount,
    cost: m.cost,
    concept: m.concept,
    date: m.date,
  };
}

/** UC-401/402: propose an edit or void; the movement keeps its old value. */
export async function proposeMovementChange(
  groupId: string,
  actorId: string,
  movementId: string,
  kind: ChangeKind,
  after?: MovementSnapshot,
): Promise<Result<{ pendingId: string }, PendingChangeError>> {
  const [movement] = await db
    .select()
    .from(movements)
    .where(and(eq(movements.id, movementId), eq(movements.groupId, groupId)));
  if (!movement) {
    return err({
      kind: "MovementNotFound",
      message: "movement not found in this group",
      movementId,
    });
  }
  // `lend` is the loan itself — never touched from here. A `repay` may be
  // voided (that undoes the collection) but never edited: its amount and
  // principal split belong to the installment, not to the movement.
  if (
    movement.type === "lend" ||
    (movement.type === "repay" && kind === "edit")
  ) {
    return err({
      kind: "SystemMovement",
      message: "loan movements are system-written; correct them via the loan",
      movementId,
    });
  }

  const pending = await db
    .select({ id: movementChanges.id })
    .from(movementChanges)
    .where(
      and(
        eq(movementChanges.movementId, movementId),
        eq(movementChanges.status, "pending"),
      ),
    );

  const decision = proposePure({
    movement: {
      id: movement.id,
      status: movement.status,
      snapshot: snapshotOf(movement),
    },
    hasPendingChange: pending.length > 0,
    kind,
    after,
    actorId,
  });
  if (!decision.ok) return decision;

  const [row] = await db
    .insert(movementChanges)
    .values(decision.value)
    .returning({ id: movementChanges.id });
  return ok({ pendingId: row.id });
}

/** UC-403: the OTHER partner approves or rejects. Applying is atomic. */
export async function decideMovementChange(
  groupId: string,
  actorId: string,
  pendingId: string,
  decision: "approve" | "reject",
): Promise<Result<{ applied: boolean }, PendingChangeError>> {
  const [row] = await db
    .select({
      change: movementChanges,
      movementGroup: movements.groupId,
      movementType: movements.type,
    })
    .from(movementChanges)
    .innerJoin(movements, eq(movements.id, movementChanges.movementId))
    .where(eq(movementChanges.id, pendingId));
  if (!row || row.movementGroup !== groupId) {
    return err({
      kind: "ChangeNotFound",
      message: "pending change not found in this group",
      pendingId,
    });
  }

  const outcome = decideChangePure({
    pending: {
      id: row.change.id,
      status: row.change.status,
      proposedBy: row.change.proposedBy,
      kind: row.change.kind,
      after: row.change.after as MovementSnapshot | null,
    },
    decision,
    actorId,
  });
  if (!outcome.ok) return outcome;

  const decidePatch = {
    status: outcome.value.pendingStatus,
    decidedBy: actorId,
    decidedAt: new Date(),
  };
  if (!outcome.value.apply) {
    await db
      .update(movementChanges)
      .set(decidePatch)
      .where(eq(movementChanges.id, pendingId));
    return ok({ applied: false });
  }

  const movementPatch =
    outcome.value.action.kind === "edit"
      ? { ...outcome.value.action.newSnapshot }
      : { status: "voided" as const };

  const decideWrite = db
    .update(movementChanges)
    .set(decidePatch)
    .where(eq(movementChanges.id, pendingId));
  const movementWrite = db
    .update(movements)
    .set(movementPatch)
    .where(eq(movements.id, row.change.movementId));

  // Undoing a collection: voiding the `repay` alone would take the cuota's cash
  // out of capital while its principal stayed "collected" — so out of `lent`
  // too, and the total would silently shrink. Returning the installment to
  // pending in the SAME batch restores the exact pre-collection capital:
  // cash −amount, lent +principal, interest back to expected.
  if (outcome.value.action.kind === "void" && row.movementType === "repay") {
    await db.batch([
      decideWrite,
      movementWrite,
      db
        .update(installments)
        .set({ status: "pending", collectedAt: null, repayMovementId: null })
        .where(eq(installments.repayMovementId, row.change.movementId)),
    ]);
    return ok({ applied: true });
  }

  await db.batch([decideWrite, movementWrite]);
  return ok({ applied: true });
}

/** All undecided changes of the group (badge + approvals list). */
export async function listPendingChanges(
  groupId: string,
): Promise<PendingChangeItem[]> {
  const rows = await db
    .select({
      id: movementChanges.id,
      movementId: movementChanges.movementId,
      kind: movementChanges.kind,
      proposedBy: movementChanges.proposedBy,
      proposerName: users.name,
      before: movementChanges.before,
      after: movementChanges.after,
      createdAt: movementChanges.createdAt,
    })
    .from(movementChanges)
    .innerJoin(movements, eq(movements.id, movementChanges.movementId))
    .innerJoin(users, eq(users.id, movementChanges.proposedBy))
    .where(
      and(
        eq(movements.groupId, groupId),
        eq(movementChanges.status, "pending"),
      ),
    )
    .orderBy(desc(movementChanges.createdAt));
  return rows.map((r) => ({
    ...r,
    before: r.before as MovementSnapshot,
    after: r.after as MovementSnapshot | null,
  }));
}

/** UC-404: immutable history of one movement (every proposal, any outcome). */
export async function listMovementHistory(
  groupId: string,
  movementId: string,
): Promise<ChangeHistoryItem[]> {
  const rows = await db
    .select({
      id: movementChanges.id,
      movementId: movementChanges.movementId,
      kind: movementChanges.kind,
      proposedBy: movementChanges.proposedBy,
      before: movementChanges.before,
      after: movementChanges.after,
      createdAt: movementChanges.createdAt,
      status: movementChanges.status,
      decidedBy: movementChanges.decidedBy,
      decidedAt: movementChanges.decidedAt,
    })
    .from(movementChanges)
    .innerJoin(movements, eq(movements.id, movementChanges.movementId))
    .where(
      and(
        eq(movements.groupId, groupId),
        eq(movementChanges.movementId, movementId),
      ),
    )
    .orderBy(desc(movementChanges.createdAt));

  if (rows.length === 0) return [];
  const userIds = [
    ...new Set(
      rows.flatMap((r) => [r.proposedBy, r.decidedBy]).filter(Boolean),
    ),
  ] as string[];
  const nameRows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, userIds));
  const names = new Map(nameRows.map((n) => [n.id, n.name]));

  return rows.map((r) => ({
    id: r.id,
    movementId: r.movementId,
    kind: r.kind,
    proposedBy: r.proposedBy,
    proposerName: names.get(r.proposedBy) ?? "?",
    before: r.before as MovementSnapshot,
    after: r.after as MovementSnapshot | null,
    createdAt: r.createdAt,
    status: r.status,
    deciderName: r.decidedBy ? (names.get(r.decidedBy) ?? "?") : null,
    decidedAt: r.decidedAt,
  }));
}

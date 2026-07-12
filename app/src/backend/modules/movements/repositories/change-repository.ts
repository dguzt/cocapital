/** movement_changes table — the append-only trail of proposals. */
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../../infra/db/client";
import { MovementChanges, Movements, Users } from "../../../infra/db/schema";
import type { Write } from "../../../infra/db/write";
import type { MovementSnapshot, MovementType } from "../domain/movement";
import type { ChangeKind, PendingStatus } from "../domain/pending";

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
  status: PendingStatus;
  deciderName: string | null;
  decidedAt: Date | null;
};

/**
 * Is there already an undecided change for this movement?
 *
 * LIMIT 1 because we only need existence: stop at the first hit instead of
 * materialising a row set. The partial unique index (one pending change per
 * movement) means Postgres can answer this straight from the index, and it
 * caps the answer at one row even if this query forgot to.
 */
export async function hasPendingFor(movementId: string) {
  const [row] = await db
    .select({ id: MovementChanges.id })
    .from(MovementChanges)
    .where(
      and(
        eq(MovementChanges.movementId, movementId),
        eq(MovementChanges.status, "pending"),
      ),
    )
    .limit(1);

  return row !== undefined;
}

export async function insert(row: {
  movementId: string;
  kind: ChangeKind;
  proposedBy: string;
  before: MovementSnapshot;
  after: MovementSnapshot | null;
}) {
  const [inserted] = await db
    .insert(MovementChanges)
    .values(row)
    .returning({ id: MovementChanges.id });
  return inserted;
}

/** The change plus the type/group of the movement it targets. */
export async function findWithMovement(pendingId: string) {
  const [row] = await db
    .select({
      change: MovementChanges,
      movementGroup: Movements.groupId,
      movementType: Movements.type,
    })
    .from(MovementChanges)
    .innerJoin(Movements, eq(Movements.id, MovementChanges.movementId))
    .where(eq(MovementChanges.id, pendingId));
  if (!row) return null;
  return {
    id: row.change.id,
    movementId: row.change.movementId,
    movementGroup: row.movementGroup,
    movementType: row.movementType as MovementType,
    status: row.change.status,
    kind: row.change.kind,
    proposedBy: row.change.proposedBy,
    after: row.change.after as MovementSnapshot | null,
  };
}

export function decideStmt(
  pendingId: string,
  patch: { status: PendingStatus; decidedBy: string; decidedAt: Date },
): Write {
  return db
    .update(MovementChanges)
    .set(patch)
    .where(eq(MovementChanges.id, pendingId));
}

export async function listPending(
  groupId: string,
): Promise<PendingChangeItem[]> {
  const rows = await db
    .select({
      id: MovementChanges.id,
      movementId: MovementChanges.movementId,
      kind: MovementChanges.kind,
      proposedBy: MovementChanges.proposedBy,
      proposerName: Users.name,
      before: MovementChanges.before,
      after: MovementChanges.after,
      createdAt: MovementChanges.createdAt,
    })
    .from(MovementChanges)
    .innerJoin(Movements, eq(Movements.id, MovementChanges.movementId))
    .innerJoin(Users, eq(Users.id, MovementChanges.proposedBy))
    .where(
      and(
        eq(Movements.groupId, groupId),
        eq(MovementChanges.status, "pending"),
      ),
    )
    .orderBy(desc(MovementChanges.createdAt));
  return rows.map((r) => ({
    ...r,
    before: r.before as MovementSnapshot,
    after: r.after as MovementSnapshot | null,
  }));
}

export async function listForMovement(
  groupId: string,
  movementId: string,
): Promise<ChangeHistoryItem[]> {
  const rows = await db
    .select({
      id: MovementChanges.id,
      movementId: MovementChanges.movementId,
      kind: MovementChanges.kind,
      proposedBy: MovementChanges.proposedBy,
      before: MovementChanges.before,
      after: MovementChanges.after,
      createdAt: MovementChanges.createdAt,
      status: MovementChanges.status,
      decidedBy: MovementChanges.decidedBy,
      decidedAt: MovementChanges.decidedAt,
    })
    .from(MovementChanges)
    .innerJoin(Movements, eq(Movements.id, MovementChanges.movementId))
    .where(
      and(
        eq(Movements.groupId, groupId),
        eq(MovementChanges.movementId, movementId),
      ),
    )
    .orderBy(desc(MovementChanges.createdAt));

  if (rows.length === 0) return [];
  const userIds = [
    ...new Set(
      rows.flatMap((r) => [r.proposedBy, r.decidedBy]).filter(Boolean),
    ),
  ] as string[];
  const nameRows = await db
    .select({ id: Users.id, name: Users.name })
    .from(Users)
    .where(inArray(Users.id, userIds));
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

/** movement_changes table — the append-only trail of proposals. */
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../../infra/db/client";
import { movementChanges, movements, users } from "../../../infra/db/schema";
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

export async function hasPendingFor(movementId: string) {
  const rows = await db
    .select({ id: movementChanges.id })
    .from(movementChanges)
    .where(
      and(
        eq(movementChanges.movementId, movementId),
        eq(movementChanges.status, "pending"),
      ),
    );
  return rows.length > 0;
}

export async function insert(row: {
  movementId: string;
  kind: ChangeKind;
  proposedBy: string;
  before: MovementSnapshot;
  after: MovementSnapshot | null;
}) {
  const [inserted] = await db
    .insert(movementChanges)
    .values(row)
    .returning({ id: movementChanges.id });
  return inserted;
}

/** The change plus the type/group of the movement it targets. */
export async function findWithMovement(pendingId: string) {
  const [row] = await db
    .select({
      change: movementChanges,
      movementGroup: movements.groupId,
      movementType: movements.type,
    })
    .from(movementChanges)
    .innerJoin(movements, eq(movements.id, movementChanges.movementId))
    .where(eq(movementChanges.id, pendingId));
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
    .update(movementChanges)
    .set(patch)
    .where(eq(movementChanges.id, pendingId));
}

export async function listPending(
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

export async function listForMovement(
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

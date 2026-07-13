/** movement_changes table — the append-only trail of proposals. */
import { and, desc, eq, inArray } from "drizzle-orm";

import type { Database } from "../../../infra/db/client";
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

/** A change plus the type and group of the movement it targets. */
export type ChangeWithMovement = {
  id: string;
  movementId: string;
  movementGroup: string;
  movementType: MovementType;
  status: PendingStatus;
  kind: ChangeKind;
  proposedBy: string;
  after: MovementSnapshot | null;
};

export class ChangeRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  /**
   * LIMIT 1 because we only need existence. The partial unique index (one
   * pending change per movement) lets Postgres answer this from the index.
   */
  async hasPendingFor(movementId: string): Promise<boolean> {
    const [row] = await this.db
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

  async insert(row: {
    movementId: string;
    kind: ChangeKind;
    proposedBy: string;
    before: MovementSnapshot;
    after: MovementSnapshot | null;
  }): Promise<{ id: string }> {
    const [inserted] = await this.db
      .insert(MovementChanges)
      .values(row)
      .returning({ id: MovementChanges.id });

    return inserted;
  }

  async findWithMovement(
    pendingId: string,
  ): Promise<ChangeWithMovement | null> {
    const [row] = await this.db
      .select({
        change: MovementChanges,
        movementGroup: Movements.groupId,
        movementType: Movements.type,
      })
      .from(MovementChanges)
      .innerJoin(Movements, eq(Movements.id, MovementChanges.movementId))
      .where(eq(MovementChanges.id, pendingId));

    if (!row) {
      return null;
    }

    return {
      id: row.change.id,
      movementId: row.change.movementId,
      movementGroup: row.movementGroup,
      movementType: row.movementType,
      status: row.change.status,
      kind: row.change.kind,
      proposedBy: row.change.proposedBy,
      after: row.change.after as MovementSnapshot | null,
    };
  }

  decideStmt(
    pendingId: string,
    patch: { status: PendingStatus; decidedBy: string; decidedAt: Date },
  ): Write {
    return this.db
      .update(MovementChanges)
      .set(patch)
      .where(eq(MovementChanges.id, pendingId));
  }

  async listPending(groupId: string): Promise<PendingChangeItem[]> {
    const rows = await this.db
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

  async listForMovement(
    groupId: string,
    movementId: string,
  ): Promise<ChangeHistoryItem[]> {
    const rows = await this.db
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

    if (rows.length === 0) {
      return [];
    }

    const names = await this.namesOf(rows);

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

  private async namesOf(
    rows: { proposedBy: string; decidedBy: string | null }[],
  ): Promise<Map<string, string>> {
    const ids = [
      ...new Set(
        rows.flatMap((r) => [r.proposedBy, r.decidedBy]).filter(Boolean),
      ),
    ] as string[];

    const names = await this.db
      .select({ id: Users.id, name: Users.name })
      .from(Users)
      .where(inArray(Users.id, ids));

    return new Map(names.map((n) => [n.id, n.name]));
  }
}

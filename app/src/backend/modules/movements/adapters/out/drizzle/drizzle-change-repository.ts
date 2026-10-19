import { and, desc, eq, inArray } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import { Users } from "@/backend/modules/accounts/adapters/out/drizzle/users.table";
import type { ChangeDecision } from "@/backend/modules/movements/domain/change-decision";
import type { ChangeHistoryItem } from "@/backend/modules/movements/domain/change-history-item";
import type { ChangeProposal } from "@/backend/modules/movements/domain/change-proposal";
import type { ChangeUnderDecision } from "@/backend/modules/movements/domain/change-under-decision";
import type { MovementSnapshot } from "@/backend/modules/movements/domain/movement";
import type { PendingChangeItem } from "@/backend/modules/movements/domain/pending-change-item";
import type { ChangeRepository } from "@/backend/modules/movements/ports/change-repository";
import { MovementChanges } from "./movement-changes.table";
import { Movements } from "./movements.table";

export class DrizzleChangeRepository implements ChangeRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

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

  async propose(change: ChangeProposal): Promise<{ id: string }> {
    const [inserted] = await this.db
      .insert(MovementChanges)
      .values(change)
      .returning({ id: MovementChanges.id });

    return inserted;
  }

  async findUnderDecision(
    pendingId: string,
  ): Promise<ChangeUnderDecision | null> {
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

  async decide(pendingId: string, decision: ChangeDecision): Promise<void> {
    await this.db
      .update(MovementChanges)
      .set(decision)
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

    return rows.map((row) => ({
      ...row,
      before: row.before as MovementSnapshot,
      after: row.after as MovementSnapshot | null,
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

    return rows.map((row) => ({
      id: row.id,
      movementId: row.movementId,
      kind: row.kind,
      proposedBy: row.proposedBy,
      proposerName: names.get(row.proposedBy) ?? "?",
      before: row.before as MovementSnapshot,
      after: row.after as MovementSnapshot | null,
      createdAt: row.createdAt,
      status: row.status,
      deciderName: row.decidedBy ? (names.get(row.decidedBy) ?? "?") : null,
      decidedAt: row.decidedAt,
    }));
  }

  private async namesOf(
    rows: { proposedBy: string; decidedBy: string | null }[],
  ): Promise<Map<string, string>> {
    const ids = [
      ...new Set(
        rows.flatMap((row) => [row.proposedBy, row.decidedBy]).filter(Boolean),
      ),
    ] as string[];

    const names = await this.db
      .select({ id: Users.id, name: Users.name })
      .from(Users)
      .where(inArray(Users.id, ids));

    return new Map(names.map((name) => [name.id, name.name]));
  }
}

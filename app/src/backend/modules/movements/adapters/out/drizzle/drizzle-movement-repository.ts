import { and, desc, eq, inArray } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import { Users } from "@/backend/modules/accounts/adapters/out/drizzle/users.table";
import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import type {
  MovementSnapshot,
  MovementStatus,
} from "@/backend/modules/movements/domain/movement";
import type { MovementEntry } from "@/backend/modules/movements/domain/movement-entry";
import type { StoredMovement } from "@/backend/modules/movements/domain/stored-movement";
import type { MovementRepository } from "@/backend/modules/movements/ports/movement-repository";
import { Movements } from "./movements.table";

export class DrizzleMovementRepository implements MovementRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async listByGroup(groupId: string): Promise<LedgerMovement[]> {
    return this.ledger()
      .where(eq(Movements.groupId, groupId))
      .orderBy(desc(Movements.createdAt));
  }

  async findInGroup(
    groupId: string,
    movementId: string,
  ): Promise<StoredMovement | null> {
    const [row] = await this.db
      .select()
      .from(Movements)
      .where(and(eq(Movements.id, movementId), eq(Movements.groupId, groupId)));

    return row ?? null;
  }

  async append(entry: MovementEntry): Promise<LedgerMovement> {
    const [inserted] = await this.db
      .insert(Movements)
      .values(entry)
      .returning({ id: Movements.id });

    const [movement] = await this.ledger().where(eq(Movements.id, inserted.id));

    return movement;
  }

  async void(movementId: string): Promise<void> {
    await this.db
      .update(Movements)
      .set({ status: "voided" })
      .where(eq(Movements.id, movementId));
  }

  async voidMany(movementIds: readonly string[]): Promise<void> {
    if (movementIds.length === 0) {
      return;
    }

    await this.db
      .update(Movements)
      .set({ status: "voided" })
      .where(inArray(Movements.id, [...movementIds]));
  }

  async applyEdit(
    movementId: string,
    snapshot: MovementSnapshot,
  ): Promise<void> {
    await this.db
      .update(Movements)
      .set({
        amount: snapshot.amount,
        cost: snapshot.cost,
        concept: snapshot.concept,
      })
      .where(eq(Movements.id, movementId));
  }

  async lock(movementId: string): Promise<MovementStatus | null> {
    const [row] = await this.db
      .select({ status: Movements.status })
      .from(Movements)
      .where(eq(Movements.id, movementId))
      .for("update");

    return row?.status ?? null;
  }

  private ledger() {
    return this.db
      .select({
        id: Movements.id,
        type: Movements.type,
        amount: Movements.amount,
        cost: Movements.cost,
        concept: Movements.concept,
        date: Movements.date,
        status: Movements.status,
        createdAt: Movements.createdAt,
        authorId: Users.id,
        authorName: Users.name,
      })
      .from(Movements)
      .innerJoin(Users, eq(Users.id, Movements.userId))
      .$dynamic();
  }
}

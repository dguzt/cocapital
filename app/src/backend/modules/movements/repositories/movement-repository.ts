/** Movements table — the shared ledger. Drizzle lives here; rules do not. */
import { and, desc, eq } from "drizzle-orm";

import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { Database } from "../../../infra/db/client";
import { Movements, Users } from "../../../infra/db/schema";
import type { Write } from "../../../infra/db/write";
import type { MovementSnapshot, MovementType } from "../domain/movement";

export type LedgerMovement = {
  id: string;
  type: MovementType;
  amount: number;
  cost: number | null;
  concept: string | null;
  date: string;
  status: (typeof Movements.$inferSelect)["status"];
  createdAt: Date;
  authorId: string;
  authorName: string;
};

export type MovementRow = typeof Movements.$inferSelect;

export type NewMovementRow = {
  id?: string;
  groupId: string;
  userId: string;
  type: MovementType;
  amount: Cents;
  cost?: Cents | null;
  concept?: string | null;
  date: ISODate;
};

export class MovementRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async listByGroup(groupId: string): Promise<LedgerMovement[]> {
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
      .where(eq(Movements.groupId, groupId))
      .orderBy(desc(Movements.createdAt));
  }

  async findInGroup(
    groupId: string,
    movementId: string,
  ): Promise<MovementRow | null> {
    const [row] = await this.db
      .select()
      .from(Movements)
      .where(and(eq(Movements.id, movementId), eq(Movements.groupId, groupId)));

    return row ?? null;
  }

  async insert(row: NewMovementRow): Promise<MovementRow> {
    const [inserted] = await this.db.insert(Movements).values(row).returning();

    return inserted;
  }

  async findAuthorName(userId: string): Promise<string | null> {
    const [author] = await this.db
      .select({ name: Users.name })
      .from(Users)
      .where(eq(Users.id, userId));

    return author?.name ?? null;
  }

  insertStmt(row: NewMovementRow & { id: string }): Write {
    return this.db.insert(Movements).values(row);
  }

  voidStmt(movementId: string): Write {
    return this.db
      .update(Movements)
      .set({ status: "voided" })
      .where(eq(Movements.id, movementId));
  }

  applyEditStmt(movementId: string, snapshot: MovementSnapshot): Write {
    return this.db
      .update(Movements)
      .set({ ...snapshot })
      .where(eq(Movements.id, movementId));
  }

  /** Only for the collect race: removes a movement the batch just orphaned. */
  async hardDelete(movementId: string): Promise<void> {
    await this.db.delete(Movements).where(eq(Movements.id, movementId));
  }
}

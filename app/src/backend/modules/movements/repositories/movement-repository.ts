/** Movements table — the shared ledger. Drizzle lives here; rules do not. */
import { and, desc, eq } from "drizzle-orm";
import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import { db } from "../../../infra/db/client";
import { movements, users } from "../../../infra/db/schema";
import type { Write } from "../../../infra/db/write";
import type { MovementSnapshot, MovementType } from "../domain/movement";

export type LedgerMovement = {
  id: string;
  type: MovementType;
  amount: number;
  cost: number | null;
  concept: string | null;
  date: string;
  status: (typeof movements.$inferSelect)["status"];
  createdAt: Date;
  authorId: string;
  authorName: string;
};

export type MovementRow = typeof movements.$inferSelect;

export async function listByGroup(groupId: string): Promise<LedgerMovement[]> {
  return db
    .select({
      id: movements.id,
      type: movements.type,
      amount: movements.amount,
      cost: movements.cost,
      concept: movements.concept,
      date: movements.date,
      status: movements.status,
      createdAt: movements.createdAt,
      authorId: users.id,
      authorName: users.name,
    })
    .from(movements)
    .innerJoin(users, eq(users.id, movements.userId))
    .where(eq(movements.groupId, groupId))
    .orderBy(desc(movements.createdAt));
}

export async function findInGroup(
  groupId: string,
  movementId: string,
): Promise<MovementRow | null> {
  const [row] = await db
    .select()
    .from(movements)
    .where(and(eq(movements.id, movementId), eq(movements.groupId, groupId)));
  return row ?? null;
}

export async function insert(row: {
  groupId: string;
  userId: string;
  type: MovementType;
  amount: Cents;
  cost?: Cents | null;
  concept?: string | null;
  date: ISODate;
}): Promise<MovementRow> {
  const [inserted] = await db.insert(movements).values(row).returning();
  return inserted;
}

export function insertStmt(row: {
  id: string;
  groupId: string;
  userId: string;
  type: MovementType;
  amount: Cents;
  cost?: Cents | null;
  concept?: string | null;
  date: ISODate;
}): Write {
  return db.insert(movements).values(row);
}

export function voidStmt(movementId: string): Write {
  return db
    .update(movements)
    .set({ status: "voided" })
    .where(eq(movements.id, movementId));
}

export function applyEditStmt(
  movementId: string,
  snapshot: MovementSnapshot,
): Write {
  return db
    .update(movements)
    .set({ ...snapshot })
    .where(eq(movements.id, movementId));
}

/** Only for the collect race: removes a movement the batch just orphaned. */
export function hardDelete(movementId: string) {
  return db.delete(movements).where(eq(movements.id, movementId));
}

export async function findAuthorName(userId: string) {
  const [author] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId));
  return author?.name ?? null;
}

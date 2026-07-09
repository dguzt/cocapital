/** M3 data layer — ledger reads/writes, explicit userId/groupId (testable). */
import { desc, eq } from "drizzle-orm";
import { db } from "../../infra/db/client";
import { movements, users } from "../../infra/db/schema";
import type { NewMovement } from "./domain/validate";

export type LedgerMovement = {
  id: string;
  type: (typeof movements.$inferSelect)["type"];
  amount: number;
  cost: number | null;
  concept: string | null;
  date: string;
  status: (typeof movements.$inferSelect)["status"];
  createdAt: Date;
  authorId: string;
  authorName: string;
};

/** Full group ledger, newest first (M5 derives from this; feed shows it). */
export async function listMovements(
  groupId: string,
): Promise<LedgerMovement[]> {
  const rows = await db
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
  return rows;
}

/** UC-201: append one validated movement. Creation is append-only (A-4). */
export async function addMovement(
  groupId: string,
  userId: string,
  input: NewMovement,
): Promise<LedgerMovement> {
  const [row] = await db
    .insert(movements)
    .values({ groupId, userId, ...input })
    .returning();
  const [author] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId));
  return { ...row, authorId: userId, authorName: author?.name ?? "?" };
}

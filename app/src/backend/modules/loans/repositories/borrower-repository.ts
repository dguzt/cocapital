/** Borrowers table. Drizzle lives here; rules do not. */
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../../infra/db/client";
import { borrowers } from "../../../infra/db/schema";
import type { Write } from "../../../infra/db/write";

export function listByGroup(groupId: string) {
  return db
    .select({ id: borrowers.id, name: borrowers.name })
    .from(borrowers)
    .where(eq(borrowers.groupId, groupId))
    .orderBy(asc(borrowers.name));
}

export async function existsInGroup(groupId: string, borrowerId: string) {
  const [row] = await db
    .select({ id: borrowers.id })
    .from(borrowers)
    .where(and(eq(borrowers.id, borrowerId), eq(borrowers.groupId, groupId)));
  return Boolean(row);
}

export function insertStmt(row: {
  id: string;
  groupId: string;
  name: string;
  phone: string | null;
}): Write {
  return db.insert(borrowers).values(row);
}

/** Borrowers table. Drizzle lives here; rules do not. */
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../../infra/db/client";
import { Borrowers } from "../../../infra/db/schema";
import type { Write } from "../../../infra/db/write";

export function listByGroup(groupId: string) {
  return db
    .select({ id: Borrowers.id, name: Borrowers.name })
    .from(Borrowers)
    .where(eq(Borrowers.groupId, groupId))
    .orderBy(asc(Borrowers.name));
}

export async function existsInGroup(groupId: string, borrowerId: string) {
  const [row] = await db
    .select({ id: Borrowers.id })
    .from(Borrowers)
    .where(and(eq(Borrowers.id, borrowerId), eq(Borrowers.groupId, groupId)));
  return Boolean(row);
}

export function insertStmt(row: {
  id: string;
  groupId: string;
  name: string;
  phone: string | null;
}): Write {
  return db.insert(Borrowers).values(row);
}

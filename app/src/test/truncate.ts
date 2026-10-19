/** Shared integration-test reset: clear ALL tables, children before parents.
 *  Every suite must use this — a partial truncate breaks other suites via FKs. */
import { db } from "@/backend/infra/db/client";
import {
  Borrowers,
  Groups,
  Installments,
  Loans,
  Memberships,
  MovementChanges,
  Movements,
  Users,
} from "@/backend/infra/db/schema";

export async function truncateAll() {
  await db.delete(Installments);
  await db.delete(Loans);
  await db.delete(Borrowers);
  await db.delete(MovementChanges);
  await db.delete(Movements);
  await db.delete(Memberships);
  await db.delete(Groups);
  await db.delete(Users);
}

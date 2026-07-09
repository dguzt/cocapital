/** Shared integration-test reset: clear ALL tables, children before parents.
 *  Every suite must use this — a partial truncate breaks other suites via FKs. */
import { db } from "../backend/infra/db/client";
import {
  borrowers,
  groups,
  installments,
  loans,
  memberships,
  movementChanges,
  movements,
  users,
} from "../backend/infra/db/schema";

export async function truncateAll() {
  await db.delete(installments);
  await db.delete(loans);
  await db.delete(borrowers);
  await db.delete(movementChanges);
  await db.delete(movements);
  await db.delete(memberships);
  await db.delete(groups);
  await db.delete(users);
}

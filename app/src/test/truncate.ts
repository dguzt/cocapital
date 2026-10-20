import { db } from "@/backend/infra/db/client";
import {
  Contacts,
  Groups,
  Installments,
  Loans,
  Memberships,
  MovementChanges,
  Movements,
  Users,
} from "@/backend/infra/db/schema";

/** Empties every table, children before parents, before each integration test. */
export async function truncateAll() {
  await db.delete(Installments);
  await db.delete(Loans);
  await db.delete(Contacts);
  await db.delete(MovementChanges);
  await db.delete(Movements);
  await db.delete(Memberships);
  await db.delete(Groups);
  await db.delete(Users);
}

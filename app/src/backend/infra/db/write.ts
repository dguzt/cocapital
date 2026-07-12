/**
 * The atomic-write seam.
 *
 * neon-http has no interactive `db.transaction()` — `db.batch()` is the atomic
 * unit, and it needs every statement up front. So repositories BUILD statements
 * and never run them; the use case that owns the rule collects them and runs
 * them together. That is what lets one use case write across tables (void a
 * movement AND reopen its installment) without a repository reaching into
 * another module's tables.
 */
import type { BatchItem } from "drizzle-orm/batch";
import { db } from "./client";

/** A Drizzle statement that has been built but not awaited. */
export type Write = BatchItem<"pg">;

/** Run writes as one transaction. All of them land, or none does. */
export function runAtomically(writes: Write[]) {
  return db.batch(writes as [Write, ...Write[]]);
}

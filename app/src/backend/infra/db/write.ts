/**
 * The atomic-write seam.
 *
 * neon-http has no interactive `db.transaction()` — `db.batch()` is the atomic
 * unit, and it needs every statement up front. So repositories BUILD statements
 * and never run them; the use case that owns the rule collects them and hands
 * them to this unit of work. That is what lets one use case write across tables
 * (void a movement AND reopen its installment) without a repository reaching
 * into another module's tables.
 */
import type { BatchItem } from "drizzle-orm/batch";

import type { Database } from "./client";

/** A Drizzle statement that has been built but not awaited. */
export type Write = BatchItem<"pg">;

export class UnitOfWork {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  /** All of the writes land, or none of them does. */
  run(writes: Write[]) {
    return this.db.batch(writes as [Write, ...Write[]]);
  }
}

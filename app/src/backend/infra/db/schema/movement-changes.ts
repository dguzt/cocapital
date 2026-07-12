/**
 * M3 · pending changes + immutable history (E4/D1).
 *
 * One table plays both roles: rows are append-only, and the only mutation ever
 * allowed is status pending -> approved|rejected (+ decidedBy/decidedAt).
 * The EditLog is simply every non-pending row.
 */
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { Movements } from "./movements";
import { Users } from "./users";

export const changeKind = pgEnum("change_kind", ["edit", "void"]);

export const changeStatus = pgEnum("change_status", [
  "pending",
  "approved",
  "rejected",
]);

export const MovementChanges = pgTable(
  "movement_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    movementId: uuid("movement_id")
      .notNull()
      .references(() => Movements.id),
    kind: changeKind("kind").notNull(),
    proposedBy: uuid("proposed_by")
      .notNull()
      .references(() => Users.id),
    /** MovementSnapshot at proposal time — the immutable "before". */
    before: jsonb("before").notNull(),
    /** MovementSnapshot proposed (edit) or null (void). */
    after: jsonb("after"),
    status: changeStatus("status").notNull().default("pending"),
    decidedBy: uuid("decided_by").references(() => Users.id),
    decidedAt: timestamp("decided_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("movement_changes_movement_idx").on(t.movementId),
    // At most ONE undecided change per movement — the state machine invariant,
    // enforced by the database so a code bug cannot break it.
    uniqueIndex("movement_changes_one_pending_idx")
      .on(t.movementId)
      .where(sql`${t.status} = 'pending'`),
  ],
);

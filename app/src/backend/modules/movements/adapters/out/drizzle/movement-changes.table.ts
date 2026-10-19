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
import { Users } from "@/backend/modules/accounts/adapters/out/drizzle/users.table";
import { Movements } from "./movements.table";

export const changeKind = pgEnum("change_kind", ["edit", "void"]);

export const changeStatus = pgEnum("change_status", [
  "pending",
  "approved",
  "rejected",
]);

/** Every proposed edit or void of a movement, pending or already decided. */
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
    /** The movement as it was when the change was proposed. */
    before: jsonb("before").notNull(),
    /** The movement as proposed by an edit; null for a void. */
    after: jsonb("after"),
    status: changeStatus("status").notNull().default("pending"),
    decidedBy: uuid("decided_by").references(() => Users.id),
    decidedAt: timestamp("decided_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("movement_changes_movement_idx").on(t.movementId),
    uniqueIndex("movement_changes_one_pending_idx")
      .on(t.movementId)
      .where(sql`${t.status} = 'pending'`),
  ],
);

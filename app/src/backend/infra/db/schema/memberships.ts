/** M2 · who belongs to which group. */
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { Users } from "@/backend/modules/accounts/adapters/out/drizzle/users.table";
import { Groups } from "./groups";

export const Memberships = pgTable(
  "memberships",
  {
    groupId: uuid("group_id")
      .notNull()
      .references(() => Groups.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => Users.id),
    /** Only 'member' behaves in MVP; creator flagged for future E5 roles. */
    role: text("role", { enum: ["creator", "member"] })
      .notNull()
      .default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.groupId, t.userId] }),
    index("memberships_user_idx").on(t.userId),
  ],
);

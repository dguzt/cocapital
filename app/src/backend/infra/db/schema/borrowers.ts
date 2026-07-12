/** M4 · people the group lends to. Reusable: select-or-create (UC-301). */
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { Groups } from "./groups";

export const Borrowers = pgTable(
  "borrowers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => Groups.id),
    name: text("name").notNull(),
    phone: text("phone"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("borrowers_group_idx").on(t.groupId)],
);

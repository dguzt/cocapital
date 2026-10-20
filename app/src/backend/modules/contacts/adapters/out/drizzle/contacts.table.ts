import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { Groups } from "@/backend/modules/groups/adapters/out/drizzle/groups.table";

/** The people a group deals with: borrowers and buyers. */
export const Contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => Groups.id),
    name: text("name").notNull(),
    phone: text("phone"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("contacts_group_idx").on(t.groupId)],
);

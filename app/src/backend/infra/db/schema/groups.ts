/** M2 · the shared pot. Fixed 2-person group in the MVP (D4). */
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const Groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  /** 8 chars from an unambiguous alphabet — it gets dictated over WhatsApp. */
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

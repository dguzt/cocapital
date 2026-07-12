import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/backend/infra/db/schema/*.ts",
  out: "./src/backend/infra/db/migrations",
  dialect: "postgresql",
  // Migrations use the direct/unpooled connection (falls back to DATABASE_URL).
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});

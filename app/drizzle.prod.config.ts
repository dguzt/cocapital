import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// One-off: point drizzle-kit at the PROD Neon branch via .env.prd (key DB_PRD).
// Not the default config — keeps prod migrations an explicit, deliberate step.
config({ path: ".env.prd" });

export default defineConfig({
  schema: "./src/backend/infra/db/schema/*.ts",
  out: "./src/backend/infra/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DB_PRD ?? "" },
});

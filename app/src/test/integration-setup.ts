/**
 * Integration tests run against the isolated Neon "test" branch — NEVER
 * against dev (your data) or main (prod). This setup swaps DATABASE_URL
 * before the db client module is imported anywhere.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const testUrl = process.env.DATABASE_URL_TEST;
if (!testUrl) {
  throw new Error(
    "DATABASE_URL_TEST is not set — integration tests need the Neon 'test' branch. " +
      "Get it with: npx neonctl connection-string test --project-id bold-bird-30398708",
  );
}
process.env.DATABASE_URL = testUrl;

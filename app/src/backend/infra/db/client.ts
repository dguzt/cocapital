import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { requireEnv } from "../../config/env";
import * as schema from "./schema";

// Talks to a Neon branch over HTTP via the edge-ready neon-http driver.
// Locally this points at a dev branch; in prod, at the production branch —
// same driver, same code, only DATABASE_URL differs.
const sql = neon(requireEnv("DATABASE_URL"));
export const db = drizzle(sql, { schema });

/** What repositories are injected with — never the module singleton directly. */
export type Database = typeof db;

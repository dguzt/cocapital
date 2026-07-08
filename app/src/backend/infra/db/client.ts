import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Talks to a Neon branch over HTTP via the edge-ready neon-http driver.
// Locally this points at a dev branch; in prod, at the production branch —
// same driver, same code, only DATABASE_URL differs.
const sql = neon(process.env.DATABASE_URL ?? "");
export const db = drizzle(sql, { schema });

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";

import { requireEnv } from "@/backend/config/env";
import * as schema from "./schema";
import { transactionAware } from "./transaction-context";

const pool = new Pool({ connectionString: requireEnv("DATABASE_URL") });

const root = drizzle({ client: pool, schema });

/** What repositories are injected with. */
export type Database = typeof root;

/** The database, or the transaction of the unit of work in progress. */
export const db: Database = transactionAware(root);

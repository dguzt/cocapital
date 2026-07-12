/** Borrowers table. Drizzle lives here; rules do not. */
import { and, asc, eq } from "drizzle-orm";

import type { Database } from "../../../infra/db/client";
import { Borrowers } from "../../../infra/db/schema";
import type { Write } from "../../../infra/db/write";

export type NewBorrowerRow = {
  id: string;
  groupId: string;
  name: string;
  phone: string | null;
};

export class BorrowerRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async listByGroup(groupId: string) {
    return this.db
      .select({ id: Borrowers.id, name: Borrowers.name })
      .from(Borrowers)
      .where(eq(Borrowers.groupId, groupId))
      .orderBy(asc(Borrowers.name));
  }

  async existsInGroup(groupId: string, borrowerId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: Borrowers.id })
      .from(Borrowers)
      .where(and(eq(Borrowers.id, borrowerId), eq(Borrowers.groupId, groupId)))
      .limit(1);

    return row !== undefined;
  }

  insertStmt(row: NewBorrowerRow): Write {
    return this.db.insert(Borrowers).values(row);
  }
}

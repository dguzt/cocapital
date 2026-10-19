import { and, asc, eq } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import type { Borrower } from "@/backend/modules/loans/domain/borrower";
import type { BorrowerEntry } from "@/backend/modules/loans/domain/borrower-entry";
import type { BorrowerRepository } from "@/backend/modules/loans/ports/borrower-repository";
import { Borrowers } from "./borrowers.table";

export class DrizzleBorrowerRepository implements BorrowerRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async listByGroup(groupId: string): Promise<Borrower[]> {
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

  async register(entry: BorrowerEntry): Promise<string> {
    const [inserted] = await this.db
      .insert(Borrowers)
      .values(entry)
      .returning({ id: Borrowers.id });

    return inserted.id;
  }
}

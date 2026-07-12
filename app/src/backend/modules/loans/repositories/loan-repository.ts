/** Loans table. Drizzle lives here; rules do not. */
import { and, desc, eq } from "drizzle-orm";

import type { Frequency, ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { Database } from "../../../infra/db/client";
import { Borrowers, Installments, Loans } from "../../../infra/db/schema";
import type { Write } from "../../../infra/db/write";

export type NewLoanRow = {
  id: string;
  groupId: string;
  userId: string;
  borrowerId: string;
  capital: Cents;
  rateBps: number;
  installmentCount: number;
  frequency: Frequency;
  startDate: ISODate;
  lendMovementId: string;
};

export class LoanRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  /** One loan with its borrower's name. The group scope IS the auth check. */
  async findInGroup(groupId: string, loanId: string) {
    const [row] = await this.db
      .select({
        id: Loans.id,
        capital: Loans.capital,
        rateBps: Loans.rateBps,
        frequency: Loans.frequency,
        startDate: Loans.startDate,
        borrowerName: Borrowers.name,
      })
      .from(Loans)
      .innerJoin(Borrowers, eq(Borrowers.id, Loans.borrowerId))
      .where(and(eq(Loans.id, loanId), eq(Loans.groupId, groupId)));

    return row ?? null;
  }

  /** Every loan of the group joined to its installments — one row per cuota. */
  async listWithInstallments(groupId: string) {
    return this.db
      .select({
        id: Loans.id,
        capital: Loans.capital,
        borrowerName: Borrowers.name,
        instStatus: Installments.status,
        instAmount: Installments.amount,
        instDue: Installments.dueDate,
      })
      .from(Loans)
      .innerJoin(Borrowers, eq(Borrowers.id, Loans.borrowerId))
      .innerJoin(Installments, eq(Installments.loanId, Loans.id))
      .where(eq(Loans.groupId, groupId))
      .orderBy(desc(Loans.createdAt));
  }

  insertStmt(row: NewLoanRow): Write {
    return this.db.insert(Loans).values(row);
  }
}

/** Loans table. Drizzle lives here; rules do not. */
import { and, desc, eq } from "drizzle-orm";
import type { Frequency, ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import { db } from "../../../infra/db/client";
import { Borrowers, Installments, Loans } from "../../../infra/db/schema";
import type { Write } from "../../../infra/db/write";

/** One loan with its borrower's name, scoped to the group (the auth check). */
export async function findInGroup(groupId: string, loanId: string) {
  const [row] = await db
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

/** Every loan of the group joined to its Installments — one row per cuota. */
export function listWithInstallments(groupId: string) {
  return db
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

export function insertStmt(row: {
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
}): Write {
  return db.insert(Loans).values(row);
}

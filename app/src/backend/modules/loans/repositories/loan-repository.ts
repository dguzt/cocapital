/** Loans table. Drizzle lives here; rules do not. */
import { and, desc, eq } from "drizzle-orm";
import type { Frequency, ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import { db } from "../../../infra/db/client";
import { borrowers, installments, loans } from "../../../infra/db/schema";
import type { Write } from "../../../infra/db/write";

/** One loan with its borrower's name, scoped to the group (the auth check). */
export async function findInGroup(groupId: string, loanId: string) {
  const [row] = await db
    .select({
      id: loans.id,
      capital: loans.capital,
      rateBps: loans.rateBps,
      frequency: loans.frequency,
      startDate: loans.startDate,
      borrowerName: borrowers.name,
    })
    .from(loans)
    .innerJoin(borrowers, eq(borrowers.id, loans.borrowerId))
    .where(and(eq(loans.id, loanId), eq(loans.groupId, groupId)));
  return row ?? null;
}

/** Every loan of the group joined to its installments — one row per cuota. */
export function listWithInstallments(groupId: string) {
  return db
    .select({
      id: loans.id,
      capital: loans.capital,
      borrowerName: borrowers.name,
      instStatus: installments.status,
      instAmount: installments.amount,
      instDue: installments.dueDate,
    })
    .from(loans)
    .innerJoin(borrowers, eq(borrowers.id, loans.borrowerId))
    .innerJoin(installments, eq(installments.loanId, loans.id))
    .where(eq(loans.groupId, groupId))
    .orderBy(desc(loans.createdAt));
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
  return db.insert(loans).values(row);
}

/** Installments table. Drizzle lives here; rules do not. */
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../../infra/db/client";
import { Installments, Loans } from "../../../infra/db/schema";
import type { Write } from "../../../infra/db/write";
import type { NewLoanInstallment } from "../domain/loan";

export function listByLoan(loanId: string) {
  return db
    .select()
    .from(Installments)
    .where(eq(Installments.loanId, loanId))
    .orderBy(asc(Installments.number));
}

/** Every installment term of the group — feeds M5's realized-only capital. */
export function listByGroup(groupId: string) {
  return db
    .select({
      principal: Installments.principal,
      interest: Installments.interest,
      status: Installments.status,
      dueDate: Installments.dueDate,
    })
    .from(Installments)
    .innerJoin(Loans, eq(Loans.id, Installments.loanId))
    .where(eq(Loans.groupId, groupId));
}

export function insertManyStmt(
  loanId: string,
  rows: NewLoanInstallment[],
): Write {
  return db.insert(Installments).values(
    rows.map((i) => ({
      loanId,
      number: i.number,
      dueDate: i.dueDate,
      amount: i.amount,
      principal: i.principal,
      interest: i.interest,
    })),
  );
}

/**
 * Flip to collected — but only if still pending. That WHERE is the
 * double-collect guard: a racing second collect updates zero rows and the
 * caller can tell, because the statement returns the ids it touched.
 */
export function markCollectedStmt(
  installmentId: string,
  repayMovementId: string,
  collectedAt: Date,
) {
  return db
    .update(Installments)
    .set({ status: "collected", collectedAt, repayMovementId })
    .where(
      and(
        eq(Installments.id, installmentId),
        eq(Installments.status, "pending"),
      ),
    )
    .returning({ id: Installments.id });
}

/** The exact inverse of markCollected: the cuota is collectable again. */
export function reopenByRepayMovementStmt(repayMovementId: string): Write {
  return db
    .update(Installments)
    .set({ status: "pending", collectedAt: null, repayMovementId: null })
    .where(eq(Installments.repayMovementId, repayMovementId));
}

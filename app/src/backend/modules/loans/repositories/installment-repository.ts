/** Installments table. Drizzle lives here; rules do not. */
import { and, asc, eq } from "drizzle-orm";
import { db } from "../../../infra/db/client";
import { installments, loans } from "../../../infra/db/schema";
import type { Write } from "../../../infra/db/write";
import type { NewLoanInstallment } from "../domain/loan";

export function listByLoan(loanId: string) {
  return db
    .select()
    .from(installments)
    .where(eq(installments.loanId, loanId))
    .orderBy(asc(installments.number));
}

/** Every installment term of the group — feeds M5's realized-only capital. */
export function listByGroup(groupId: string) {
  return db
    .select({
      principal: installments.principal,
      interest: installments.interest,
      status: installments.status,
      dueDate: installments.dueDate,
    })
    .from(installments)
    .innerJoin(loans, eq(loans.id, installments.loanId))
    .where(eq(loans.groupId, groupId));
}

export function insertManyStmt(
  loanId: string,
  rows: NewLoanInstallment[],
): Write {
  return db.insert(installments).values(
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
    .update(installments)
    .set({ status: "collected", collectedAt, repayMovementId })
    .where(
      and(
        eq(installments.id, installmentId),
        eq(installments.status, "pending"),
      ),
    )
    .returning({ id: installments.id });
}

/** The exact inverse of markCollected: the cuota is collectable again. */
export function reopenByRepayMovementStmt(repayMovementId: string): Write {
  return db
    .update(installments)
    .set({ status: "pending", collectedAt: null, repayMovementId: null })
    .where(eq(installments.repayMovementId, repayMovementId));
}

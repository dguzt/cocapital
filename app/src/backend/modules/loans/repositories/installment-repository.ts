/** Installments table. Drizzle lives here; rules do not. */
import { and, asc, eq, isNotNull, ne } from "drizzle-orm";

import type { Database } from "../../../infra/db/client";
import { Installments, Loans } from "../../../infra/db/schema";
import type { Write } from "../../../infra/db/write";
import type { NewLoanInstallment } from "../domain/loan";

export class InstallmentRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async listByLoan(loanId: string) {
    return this.db
      .select()
      .from(Installments)
      .where(eq(Installments.loanId, loanId))
      .orderBy(asc(Installments.number));
  }

  /** Every installment term of the group — feeds M5's realized-only capital.
   *  A voided loan's cuotas are excluded: they no longer count as `lent`. */
  async listByGroup(groupId: string) {
    return this.db
      .select({
        principal: Installments.principal,
        interest: Installments.interest,
        status: Installments.status,
        dueDate: Installments.dueDate,
      })
      .from(Installments)
      .innerJoin(Loans, eq(Loans.id, Installments.loanId))
      .where(and(eq(Loans.groupId, groupId), ne(Loans.status, "voided")));
  }

  /** The repay movements of a loan's collected cuotas — voided as a batch when
   *  the loan is cancelled, so each collection's cash comes back out. */
  async repayMovementIdsOf(loanId: string): Promise<string[]> {
    const rows = await this.db
      .select({ repayMovementId: Installments.repayMovementId })
      .from(Installments)
      .where(
        and(
          eq(Installments.loanId, loanId),
          isNotNull(Installments.repayMovementId),
        ),
      );

    return rows.map((r) => r.repayMovementId).filter((id) => id !== null);
  }

  /** The cuota a `repay` movement collected, scoped to the group (auth) — lets a
   *  cobro row link to its cuota on the loan page. */
  async findByRepayMovement(
    groupId: string,
    repayMovementId: string,
  ): Promise<{ loanId: string; installmentId: string } | null> {
    const [row] = await this.db
      .select({ loanId: Installments.loanId, installmentId: Installments.id })
      .from(Installments)
      .innerJoin(Loans, eq(Loans.id, Installments.loanId))
      .where(
        and(
          eq(Installments.repayMovementId, repayMovementId),
          eq(Loans.groupId, groupId),
        ),
      );

    return row ?? null;
  }

  insertManyStmt(loanId: string, rows: NewLoanInstallment[]): Write {
    return this.db.insert(Installments).values(
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
   * double-collect guard: a racing second collect updates zero rows, and the
   * statement returns the ids it touched so the caller can tell.
   */
  markCollectedStmt(
    installmentId: string,
    repayMovementId: string,
    collectedAt: Date,
  ) {
    return this.db
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
  reopenByRepayMovementStmt(repayMovementId: string): Write {
    return this.db
      .update(Installments)
      .set({ status: "pending", collectedAt: null, repayMovementId: null })
      .where(eq(Installments.repayMovementId, repayMovementId));
  }
}

import { and, asc, eq, isNotNull, ne } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import type { Installment } from "@/backend/modules/loans/domain/installment";
import type { InstallmentTerm } from "@/backend/modules/loans/domain/installment-term";
import type { NewLoanInstallment } from "@/backend/modules/loans/domain/loan";
import type { InstallmentRepository } from "@/backend/modules/loans/ports/installment-repository";
import { Installments } from "./installments.table";
import { Loans } from "./loans.table";

export class DrizzleInstallmentRepository implements InstallmentRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async listByLoan(loanId: string): Promise<Installment[]> {
    return this.db
      .select()
      .from(Installments)
      .where(eq(Installments.loanId, loanId))
      .orderBy(asc(Installments.number));
  }

  async listTermsByGroup(groupId: string): Promise<InstallmentTerm[]> {
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

    return rows.map((row) => row.repayMovementId).filter((id) => id !== null);
  }

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

  async schedule(
    loanId: string,
    installments: NewLoanInstallment[],
  ): Promise<void> {
    await this.db.insert(Installments).values(
      installments.map((installment) => ({
        loanId,
        number: installment.number,
        dueDate: installment.dueDate,
        amount: installment.amount,
        principal: installment.principal,
        interest: installment.interest,
      })),
    );
  }

  async markCollected(
    installmentId: string,
    repayMovementId: string,
    collectedAt: Date,
  ): Promise<boolean> {
    const updated = await this.db
      .update(Installments)
      .set({ status: "collected", collectedAt, repayMovementId })
      .where(
        and(
          eq(Installments.id, installmentId),
          eq(Installments.status, "pending"),
        ),
      )
      .returning({ id: Installments.id });

    return updated.length > 0;
  }

  async reopenByRepayMovement(repayMovementId: string): Promise<void> {
    await this.db
      .update(Installments)
      .set({ status: "pending", collectedAt: null, repayMovementId: null })
      .where(eq(Installments.repayMovementId, repayMovementId));
  }
}

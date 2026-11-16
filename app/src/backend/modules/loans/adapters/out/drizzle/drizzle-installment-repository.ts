import { and, asc, count, eq, isNotNull, lt, ne, sql } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import type { Installment } from "@/backend/modules/loans/domain/installment";
import type { InstallmentTotal } from "@/backend/modules/loans/domain/installment-total";
import type { Schedule } from "@/backend/modules/loans/domain/schedule";
import type { InstallmentRepository } from "@/backend/modules/loans/ports/installment-repository";
import type { ISODate } from "@/lib/dates";
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

  async totalsByGroup(groupId: string): Promise<InstallmentTotal[]> {
    return this.db
      .select({
        status: Installments.status,
        principal: sql<number>`sum(${Installments.principal})`.mapWith(Number),
        interest: sql<number>`sum(${Installments.interest})`.mapWith(Number),
      })
      .from(Installments)
      .innerJoin(Loans, eq(Loans.id, Installments.loanId))
      .where(and(eq(Loans.groupId, groupId), ne(Loans.status, "voided")))
      .groupBy(Installments.status);
  }

  async countOverdue(groupId: string, today: ISODate): Promise<number> {
    const [row] = await this.db
      .select({ overdue: count() })
      .from(Installments)
      .innerJoin(Loans, eq(Loans.id, Installments.loanId))
      .where(
        and(
          eq(Loans.groupId, groupId),
          ne(Loans.status, "voided"),
          eq(Installments.status, "pending"),
          lt(Installments.dueDate, today),
        ),
      );

    return row.overdue;
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

  async schedule(loanId: string, schedule: Schedule): Promise<void> {
    await this.db.insert(Installments).values(
      schedule.installments.map((installment) => ({
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

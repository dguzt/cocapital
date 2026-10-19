import { and, desc, eq } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import type { LoanEntry } from "@/backend/modules/loans/domain/loan-entry";
import type { LoanHeader } from "@/backend/modules/loans/domain/loan-header";
import type { LoanScheduleRow } from "@/backend/modules/loans/domain/loan-schedule-row";
import type { LoanRepository } from "@/backend/modules/loans/ports/loan-repository";
import { Borrowers } from "./borrowers.table";
import { Installments } from "./installments.table";
import { Loans } from "./loans.table";

export class DrizzleLoanRepository implements LoanRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async findInGroup(
    groupId: string,
    loanId: string,
  ): Promise<LoanHeader | null> {
    const [row] = await this.db
      .select({
        id: Loans.id,
        capital: Loans.capital,
        rateBps: Loans.rateBps,
        frequency: Loans.frequency,
        status: Loans.status,
        startDate: Loans.startDate,
        lendMovementId: Loans.lendMovementId,
        borrowerName: Borrowers.name,
      })
      .from(Loans)
      .innerJoin(Borrowers, eq(Borrowers.id, Loans.borrowerId))
      .where(and(eq(Loans.id, loanId), eq(Loans.groupId, groupId)));

    return row ?? null;
  }

  async idByLendMovement(
    lendMovementId: string,
    groupId?: string,
  ): Promise<string | null> {
    const [row] = await this.db
      .select({ id: Loans.id })
      .from(Loans)
      .where(
        and(
          eq(Loans.lendMovementId, lendMovementId),
          groupId ? eq(Loans.groupId, groupId) : undefined,
        ),
      );

    return row?.id ?? null;
  }

  async listSchedules(groupId: string): Promise<LoanScheduleRow[]> {
    return this.db
      .select({
        id: Loans.id,
        capital: Loans.capital,
        status: Loans.status,
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

  async register(entry: LoanEntry): Promise<string> {
    const [inserted] = await this.db
      .insert(Loans)
      .values(entry)
      .returning({ id: Loans.id });

    return inserted.id;
  }

  async void(loanId: string): Promise<void> {
    await this.db
      .update(Loans)
      .set({ status: "voided" })
      .where(eq(Loans.id, loanId));
  }
}

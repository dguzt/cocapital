import { and, count, desc, eq, sql } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import { Contacts } from "@/backend/modules/contacts/adapters/out/drizzle/contacts.table";
import type { LoanEntry } from "@/backend/modules/loans/domain/loan-entry";
import type { LoanHeader } from "@/backend/modules/loans/domain/loan-header";
import type { LoanListItem } from "@/backend/modules/loans/domain/loan-list-item";
import type { LoanRepository } from "@/backend/modules/loans/ports/loan-repository";
import type { ISODate } from "@/lib/dates";
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
        borrowerName: Contacts.name,
      })
      .from(Loans)
      .innerJoin(Contacts, eq(Contacts.id, Loans.borrowerId))
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

  async listItems(groupId: string, today: ISODate): Promise<LoanListItem[]> {
    const pending = sql`${Installments.status} = 'pending'`;

    return this.db
      .select({
        id: Loans.id,
        borrowerName: Contacts.name,
        capital: Loans.capital,
        status: Loans.status,
        collectedCount:
          sql<number>`count(*) FILTER (WHERE NOT ${pending})`.mapWith(Number),
        totalCount: count(),
        overdueCount:
          sql<number>`count(*) FILTER (WHERE ${pending} AND ${Installments.dueDate} < ${today})`.mapWith(
            Number,
          ),
        pendingAmount:
          sql<number>`coalesce(sum(${Installments.amount}) FILTER (WHERE ${pending}), 0)`.mapWith(
            Number,
          ),
      })
      .from(Loans)
      .innerJoin(Contacts, eq(Contacts.id, Loans.borrowerId))
      .innerJoin(Installments, eq(Installments.loanId, Loans.id))
      .where(eq(Loans.groupId, groupId))
      .groupBy(Loans.id, Contacts.name)
      .orderBy(desc(Loans.createdAt));
  }

  async register(entry: LoanEntry): Promise<string> {
    const [inserted] = await this.db
      .insert(Loans)
      .values(entry)
      .returning({ id: Loans.id });

    return inserted.id;
  }

  async lock(loanId: string): Promise<"active" | "voided" | null> {
    const [row] = await this.db
      .select({ status: Loans.status })
      .from(Loans)
      .where(eq(Loans.id, loanId))
      .for("update");

    return row?.status ?? null;
  }

  async void(loanId: string): Promise<void> {
    await this.db
      .update(Loans)
      .set({ status: "voided" })
      .where(eq(Loans.id, loanId));
  }
}

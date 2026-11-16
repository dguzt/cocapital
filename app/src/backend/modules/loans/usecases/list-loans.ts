import type { LoanListItem } from "@/backend/modules/loans/domain/loan-list-item";
import type { LoanRepository } from "@/backend/modules/loans/ports/loan-repository";
import type { ISODate } from "@/lib/dates";

export type ListLoansInput = {
  groupId: string;
  today: ISODate;
};

/** Reads the group's loans with the figures each card shows. */
export class ListLoans {
  static inject = ["loans"] as const;

  constructor(private readonly loans: LoanRepository) {}

  /**
   * Lists the loans.
   *
   * @param input - The group and today's date, to count overdue cuotas.
   * @returns One item per loan, newest first.
   */
  async execute(input: ListLoansInput): Promise<LoanListItem[]> {
    return this.loans.listItems(input.groupId, input.today);
  }
}

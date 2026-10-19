import * as R from "remeda";

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
    const rows = await this.loans.listSchedules(input.groupId);

    return R.pipe(
      rows,
      R.groupBy((row) => row.id),
      R.entries(),
      R.map(([id, cuotas]) => {
        const pending = cuotas.filter((row) => row.instStatus === "pending");

        return {
          id,
          borrowerName: cuotas[0].borrowerName,
          capital: cuotas[0].capital,
          status: cuotas[0].status,
          collectedCount: cuotas.length - pending.length,
          totalCount: cuotas.length,
          overdueCount: pending.filter((row) => row.instDue < input.today)
            .length,
          pendingAmount: R.sumBy(pending, (row) => row.instAmount),
        };
      }),
    );
  }
}

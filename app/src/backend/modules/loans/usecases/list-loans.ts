/**
 * UC-303 · The loans list, with the numbers each card shows.
 *
 * Overdue is derived against `today`, which arrives as INPUT — no function in
 * this backend reads the clock on its own, which is what makes the tests
 * deterministic.
 */
import * as R from "remeda";

import type { ISODate } from "@/lib/dates";
import type { LoanListItem } from "../domain/loan";
import type { LoanRepository } from "../repositories/loan-repository";

export type ListLoansInput = {
  groupId: string;
  today: ISODate;
};

export class ListLoans {
  static inject = ["loans"] as const;

  constructor(private readonly loans: LoanRepository) {}

  async execute(input: ListLoansInput): Promise<LoanListItem[]> {
    const rows = await this.loans.listWithInstallments(input.groupId);

    return R.pipe(
      rows,
      R.groupBy((r) => r.id),
      R.entries(),
      R.map(([id, group]) => {
        const pending = group.filter((r) => r.instStatus === "pending");

        return {
          id,
          borrowerName: group[0].borrowerName,
          capital: group[0].capital,
          collectedCount: group.length - pending.length,
          totalCount: group.length,
          overdueCount: pending.filter((r) => r.instDue < input.today).length,
          pendingAmount: R.sumBy(pending, (r) => r.instAmount),
        };
      }),
    );
  }
}

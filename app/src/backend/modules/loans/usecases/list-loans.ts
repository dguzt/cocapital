/**
 * UC-303 · The loans list, with the per-loan numbers the card shows.
 * Overdue is derived against `today` at read time — never stored (D3).
 */
import * as R from "remeda";
import type { ISODate } from "@/lib/dates";
import type { LoanListItem } from "../domain/loan";
import * as loanRepo from "../repositories/loan-repository";

export async function listLoans(
  groupId: string,
  today: ISODate,
): Promise<LoanListItem[]> {
  const rows = await loanRepo.listWithInstallments(groupId);

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
        overdueCount: pending.filter((r) => r.instDue < today).length,
        pendingAmount: R.sumBy(pending, (r) => r.instAmount),
      };
    }),
  );
}

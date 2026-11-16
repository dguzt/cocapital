import { CapitalSummary } from "@/backend/modules/capital/domain/capital-summary";
import type { TotalInstallments } from "@/backend/modules/loans/usecases/total-installments";
import type { TotalMovements } from "@/backend/modules/movements/usecases/total-movements";

export type GetCapitalSummaryInput = {
  groupId: string;
};

/** Reads where a group's capital is: cash, inventory and lent. */
export class GetCapitalSummary {
  static inject = ["totalMovements", "totalInstallments"] as const;

  constructor(
    private readonly totalMovements: TotalMovements,
    private readonly totalInstallments: TotalInstallments,
  ) {}

  /**
   * Derives the capital from the ledger and the loans' cuotas, added up by
   * the database. Expected interest is shown apart and never counts toward
   * the total.
   *
   * @param input - The group.
   * @returns The total, each bucket, and the profit collected and expected.
   */
  async execute(input: GetCapitalSummaryInput): Promise<CapitalSummary> {
    const [movements, installments] = await Promise.all([
      this.totalMovements.execute(input),
      this.totalInstallments.execute(input),
    ]);

    return CapitalSummary.derive(movements, installments);
  }
}

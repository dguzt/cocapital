import { CapitalSummary } from "@/backend/modules/capital/domain/capital-summary";
import type { ListGroupInstallments } from "@/backend/modules/loans/usecases/list-group-installments";
import type { ListMovements } from "@/backend/modules/movements/usecases/list-movements";

export type GetCapitalSummaryInput = {
  groupId: string;
};

/** Reads where a group's capital is: cash, inventory and lent. */
export class GetCapitalSummary {
  static inject = ["listMovements", "listGroupInstallments"] as const;

  constructor(
    private readonly listMovements: ListMovements,
    private readonly listGroupInstallments: ListGroupInstallments,
  ) {}

  /**
   * Derives the capital from the ledger and the loans' cuotas. Expected
   * interest is shown apart and never counts toward the total.
   *
   * @param input - The group.
   * @returns The total, each bucket, and the profit collected and expected.
   */
  async execute(input: GetCapitalSummaryInput): Promise<CapitalSummary> {
    const [movements, installments] = await Promise.all([
      this.listMovements.execute(input),
      this.listGroupInstallments.execute(input),
    ]);

    return CapitalSummary.derive(movements, installments);
  }
}

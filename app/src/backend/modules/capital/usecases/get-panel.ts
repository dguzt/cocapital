import { CapitalSummary } from "@/backend/modules/capital/domain/capital-summary";
import type { ListGroupInstallments } from "@/backend/modules/loans/usecases/list-group-installments";
import type { ListMovements } from "@/backend/modules/movements/usecases/list-movements";

export type GetPanelInput = {
  groupId: string;
};

export type Panel = {
  movements: Awaited<ReturnType<ListMovements["execute"]>>;
  installments: Awaited<ReturnType<ListGroupInstallments["execute"]>>;
  capital: CapitalSummary;
};

/** Reads what the Panel shows: the ledger, the cuotas and the capital they add up to. */
export class GetPanel {
  static inject = ["listMovements", "listGroupInstallments"] as const;

  constructor(
    private readonly listMovements: ListMovements,
    private readonly listGroupInstallments: ListGroupInstallments,
  ) {}

  /**
   * Reads the ledger and the cuotas once, and derives the capital from them.
   *
   * @param input - The group.
   * @returns The movements, the cuotas and the capital.
   */
  async execute(input: GetPanelInput): Promise<Panel> {
    const [movements, installments] = await Promise.all([
      this.listMovements.execute(input),
      this.listGroupInstallments.execute(input),
    ]);

    return {
      movements,
      installments,
      capital: CapitalSummary.derive(movements, installments),
    };
  }
}

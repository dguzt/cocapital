import type { CapitalSummary } from "@/backend/modules/capital/domain/capital-summary";
import type { GetCapitalSummary } from "@/backend/modules/capital/usecases/get-capital-summary";
import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import type { ListMovements } from "@/backend/modules/movements/usecases/list-movements";

export type GetPanelInput = {
  groupId: string;
};

export type Panel = {
  movements: LedgerMovement[];
  capital: CapitalSummary;
};

export const PANEL_RECENT_MOVEMENTS = 6;

/** Reads what the Panel shows: the latest movements and where the capital is. */
export class GetPanel {
  static inject = ["listMovements", "getCapitalSummary"] as const;

  constructor(
    private readonly listMovements: ListMovements,
    private readonly getCapitalSummary: GetCapitalSummary,
  ) {}

  /**
   * Reads the latest movements and the capital.
   *
   * @param input - The group.
   * @returns The latest movements and the capital.
   */
  async execute(input: GetPanelInput): Promise<Panel> {
    const [movements, capital] = await Promise.all([
      this.listMovements.execute({
        groupId: input.groupId,
        limit: PANEL_RECENT_MOVEMENTS,
      }),
      this.getCapitalSummary.execute(input),
    ]);

    return { movements, capital };
  }
}

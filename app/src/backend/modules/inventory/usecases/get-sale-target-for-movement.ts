import type { SaleTarget } from "@/backend/modules/inventory/domain/sale-target";
import type { CreditSaleRepository } from "@/backend/modules/inventory/ports/credit-sale-repository";
import type { MovementType } from "@/backend/modules/movements/domain/movement";

export type GetSaleTargetForMovementInput = {
  groupId: string;
  movementId: string;
  movementType: MovementType;
};

/** Finds the credit sale, and for a cobro the cuota, that a ledger row belongs to. */
export class GetSaleTargetForMovement {
  static inject = ["creditSales"] as const;

  constructor(private readonly creditSales: CreditSaleRepository) {}

  /**
   * Resolves where the movement leads.
   *
   * @param input - The group asking, the movement and its type.
   * @returns The sale and cuota, or null for a movement that is not a
   *   sell_on_credit or collect_sale of this group.
   */
  async execute(
    input: GetSaleTargetForMovementInput,
  ): Promise<SaleTarget | null> {
    if (input.movementType === "sell_on_credit") {
      const saleId = await this.creditSales.idBySaleMovement(
        input.movementId,
        input.groupId,
      );

      return saleId ? { saleId, installmentId: null } : null;
    }

    if (input.movementType === "collect_sale") {
      return this.creditSales.findByCollectMovement(
        input.groupId,
        input.movementId,
      );
    }

    return null;
  }
}

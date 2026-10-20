import type { CreditSaleRepository } from "@/backend/modules/inventory/ports/credit-sale-repository";
import type { VoidEntry } from "@/backend/modules/movements/usecases/void-entry";

export type VoidCreditSaleInput = {
  saleMovementId: string;
};

/**
 * Cancels a credit sale: its sell_on_credit movement returns the cost to
 * inventory, and every cobro's collect_sale movement takes its cash back out.
 */
export class VoidCreditSale {
  static inject = ["creditSales", "voidEntry"] as const;

  constructor(
    private readonly creditSales: CreditSaleRepository,
    private readonly voidEntry: VoidEntry,
  ) {}

  /**
   * Voids the sale behind a sell_on_credit movement. Runs inside the unit of
   * work of the approval.
   *
   * @param input - The sale's sell_on_credit movement.
   * @throws When no credit sale was booked by that movement.
   */
  async execute(input: VoidCreditSaleInput): Promise<void> {
    const saleId = await this.creditSales.idBySaleMovement(
      input.saleMovementId,
    );

    if (!saleId) {
      throw new Error("no credit sale owns this sell_on_credit movement");
    }

    const collectMovementIds =
      await this.creditSales.collectMovementIdsOf(saleId);

    await this.creditSales.void(saleId);

    await this.voidEntry.execute({ movementId: input.saleMovementId });

    for (const movementId of collectMovementIds) {
      await this.voidEntry.execute({ movementId });
    }
  }
}

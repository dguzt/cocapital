import type { CreditSaleError } from "@/backend/modules/inventory/domain/errors";
import type { CreditSaleRepository } from "@/backend/modules/inventory/ports/credit-sale-repository";
import type { PendingChangeError } from "@/backend/modules/movements/domain/errors";
import type { ProposeSystemVoid } from "@/backend/modules/movements/usecases/propose-system-void";
import { err, type Result } from "@/lib/result";

export type ProposeVoidCreditSaleInput = {
  groupId: string;
  actorId: string;
  saleId: string;
};

/**
 * Proposes cancelling a whole credit sale, as a void of its sell_on_credit
 * movement. Another partner approves it in the approvals inbox.
 */
export class ProposeVoidCreditSale {
  static inject = ["creditSales", "proposeSystemVoid"] as const;

  constructor(
    private readonly creditSales: CreditSaleRepository,
    private readonly proposeSystemVoid: ProposeSystemVoid,
  ) {}

  /**
   * Opens the pending cancellation.
   *
   * @param input - The group, the proposing partner and the sale.
   * @returns The pending change's id, or `CreditSaleNotFound`,
   *   `CreditSaleVoided` or why the void cannot be proposed.
   */
  async execute(
    input: ProposeVoidCreditSaleInput,
  ): Promise<
    Result<{ pendingId: string }, CreditSaleError | PendingChangeError>
  > {
    const sale = await this.creditSales.findInGroup(
      input.groupId,
      input.saleId,
    );

    if (!sale) {
      return err({
        kind: "CreditSaleNotFound",
        message: "credit sale not found",
        saleId: input.saleId,
      });
    }

    if (sale.status === "voided") {
      return err({
        kind: "CreditSaleVoided",
        message: "credit sale is already voided",
        saleId: input.saleId,
      });
    }

    return this.proposeSystemVoid.execute({
      groupId: input.groupId,
      actorId: input.actorId,
      movementId: sale.saleMovementId,
    });
  }
}

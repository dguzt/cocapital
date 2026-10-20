import type { CreditSale } from "@/backend/modules/inventory/domain/credit-sale";
import type { CreditSaleError } from "@/backend/modules/inventory/domain/errors";
import type { CreditSaleRepository } from "@/backend/modules/inventory/ports/credit-sale-repository";
import { err, ok, type Result } from "@/lib/result";

export type GetCreditSaleInput = {
  groupId: string;
  saleId: string;
};

/** Reads one credit sale of the group with its cuotas. */
export class GetCreditSale {
  static inject = ["creditSales"] as const;

  constructor(private readonly creditSales: CreditSaleRepository) {}

  /**
   * Reads the sale.
   *
   * @param input - The group asking and the sale.
   * @returns The sale, or `CreditSaleNotFound`.
   */
  async execute(
    input: GetCreditSaleInput,
  ): Promise<Result<CreditSale, CreditSaleError>> {
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

    return ok(sale);
  }
}

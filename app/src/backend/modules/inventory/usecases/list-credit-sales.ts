import type { CreditSale } from "@/backend/modules/inventory/domain/credit-sale";
import type { CreditSaleRepository } from "@/backend/modules/inventory/ports/credit-sale-repository";

export type ListCreditSalesInput = {
  groupId: string;
};

/** Reads the group's credit sales. */
export class ListCreditSales {
  static inject = ["creditSales"] as const;

  constructor(private readonly creditSales: CreditSaleRepository) {}

  /**
   * Lists the sales.
   *
   * @param input - The group.
   * @returns Its sales with their cuotas, newest first.
   */
  async execute(input: ListCreditSalesInput): Promise<CreditSale[]> {
    return this.creditSales.listByGroup(input.groupId);
  }
}

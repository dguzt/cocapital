import type { CreditSaleListItem } from "@/backend/modules/inventory/domain/credit-sale-list-item";
import type { CreditSaleRepository } from "@/backend/modules/inventory/ports/credit-sale-repository";
import type { ISODate } from "@/lib/dates";

export type ListCreditSalesInput = {
  groupId: string;
  today: ISODate;
};

/** Reads the group's credit sales with the figures each card shows. */
export class ListCreditSales {
  static inject = ["creditSales"] as const;

  constructor(private readonly creditSales: CreditSaleRepository) {}

  /**
   * Lists the sales.
   *
   * @param input - The group and today's date, to count overdue cuotas.
   * @returns One item per sale, newest first.
   */
  async execute(input: ListCreditSalesInput): Promise<CreditSaleListItem[]> {
    return this.creditSales.listItems(input.groupId, input.today);
  }
}

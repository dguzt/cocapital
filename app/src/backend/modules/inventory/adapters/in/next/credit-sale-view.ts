import type { CreditSale } from "@/backend/modules/inventory/domain/credit-sale";
import type { CreditSaleStatus } from "@/backend/modules/inventory/domain/credit-sale-status";
import type { SaleInstallmentStatus } from "@/backend/modules/inventory/domain/sale-installment-status";
import { type Frequency, type ISODate, isOverdue } from "@/lib/dates";
import type { Cents } from "@/lib/money";

/** A credit sale as plain data, with the figures its pages show. */
export type CreditSaleView = {
  id: string;
  buyerName: string;
  item: string;
  price: Cents;
  cost: Cents | null;
  frequency: Frequency;
  startDate: ISODate;
  status: CreditSaleStatus;
  settled: boolean;
  saleMovementId: string;
  expectedMargin: Cents;
  collectedAmount: Cents;
  pendingAmount: Cents;
  collectedCount: number;
  totalCount: number;
  overdueCount: number;
  installments: {
    id: string;
    number: number;
    dueDate: ISODate;
    amount: Cents;
    status: SaleInstallmentStatus;
    overdue: boolean;
    costShare: Cents | null;
    collectMovementId: string | null;
  }[];
};

/**
 * Turns a credit sale into plain data for the pages.
 *
 * @param sale - The sale.
 * @param today - Today's date in Lima, to tell overdue cuotas.
 * @returns The sale with its totals and cuotas.
 */
export function toCreditSaleView(
  sale: CreditSale,
  today: ISODate,
): CreditSaleView {
  return {
    id: sale.id,
    buyerName: sale.buyer.name,
    item: sale.item,
    price: sale.price,
    cost: sale.cost,
    frequency: sale.frequency,
    startDate: sale.startDate,
    status: sale.status,
    settled: sale.isSettled(),
    saleMovementId: sale.saleMovementId,
    expectedMargin: sale.expectedMargin(),
    collectedAmount: sale.collectedAmount(),
    pendingAmount: sale.pendingAmount(),
    collectedCount: sale.collectedInstallments().length,
    totalCount: sale.installments.length,
    overdueCount: sale.overdueCount(today),
    installments: sale.installments.map((installment) => ({
      ...installment,
      overdue:
        sale.status === "active" &&
        installment.status === "pending" &&
        isOverdue(installment.dueDate, today),
    })),
  };
}

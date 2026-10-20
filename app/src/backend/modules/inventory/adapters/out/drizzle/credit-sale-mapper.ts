import { CreditSale } from "@/backend/modules/inventory/domain/credit-sale";
import type { CreditSaleInstallment } from "@/backend/modules/inventory/domain/credit-sale-installment";
import type { CreditSaleInstallments } from "./credit-sale-installments.table";
import type { CreditSales } from "./credit-sales.table";

type CreditSaleRow = typeof CreditSales.$inferSelect;

type InstallmentRow = typeof CreditSaleInstallments.$inferSelect;

/** Translates between the credit sale tables and the CreditSale entity. */
export class CreditSaleMapper {
  /**
   * Builds the entity from the rows that store it.
   *
   * @param sale - The row of the credit_sales table.
   * @param buyerName - The name of the buyer contact.
   * @param installments - Cuotas of any sales; only this sale's are kept.
   * @returns The sale as the domain knows it.
   */
  static toDomain(
    sale: CreditSaleRow,
    buyerName: string,
    installments: InstallmentRow[],
  ): CreditSale {
    return CreditSale.restore({
      id: sale.id,
      groupId: sale.groupId,
      userId: sale.userId,
      buyer: { id: sale.buyerId, name: buyerName },
      item: sale.item,
      price: sale.price,
      cost: sale.cost,
      frequency: sale.frequency,
      startDate: sale.startDate,
      status: sale.status,
      saleMovementId: sale.saleMovementId,
      installments: installments
        .filter((row) => row.saleId === sale.id)
        .map(CreditSaleMapper.installmentToDomain),
    });
  }

  /**
   * Builds the row that stores a sale.
   *
   * @param sale - The entity to store.
   * @returns The values for an insert into the credit_sales table.
   */
  static toRow(sale: CreditSale): typeof CreditSales.$inferInsert {
    return {
      id: sale.id,
      groupId: sale.groupId,
      userId: sale.userId,
      buyerId: sale.buyer.id,
      item: sale.item,
      price: sale.price,
      cost: sale.cost,
      frequency: sale.frequency,
      startDate: sale.startDate,
      status: sale.status,
      saleMovementId: sale.saleMovementId,
    };
  }

  /**
   * Builds the row that stores a cuota.
   *
   * @param saleId - The sale the cuota belongs to.
   * @param installment - The cuota.
   * @returns The values for an insert into the credit_sale_installments table.
   */
  static toInstallmentRow(
    saleId: string,
    installment: CreditSaleInstallment,
  ): typeof CreditSaleInstallments.$inferInsert {
    return {
      id: installment.id,
      saleId,
      number: installment.number,
      dueDate: installment.dueDate,
      amount: installment.amount,
      status: installment.status,
      costShare: installment.costShare,
      collectMovementId: installment.collectMovementId,
    };
  }

  private static installmentToDomain(
    row: InstallmentRow,
  ): CreditSaleInstallment {
    return {
      id: row.id,
      number: row.number,
      dueDate: row.dueDate,
      amount: row.amount,
      status: row.status,
      costShare: row.costShare,
      collectMovementId: row.collectMovementId,
    };
  }
}

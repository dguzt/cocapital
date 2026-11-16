import type { CreditSale } from "@/backend/modules/inventory/domain/credit-sale";
import type { CreditSaleInstallment } from "@/backend/modules/inventory/domain/credit-sale-installment";
import type { CreditSaleListItem } from "@/backend/modules/inventory/domain/credit-sale-list-item";
import type { ISODate } from "@/lib/dates";

/** Storage of credit sales and their cuotas. */
export interface CreditSaleRepository {
  /**
   * Stores a new credit sale with its cuotas.
   *
   * @param sale - The sale to store.
   */
  add(sale: CreditSale): Promise<void>;

  /**
   * Finds a credit sale, only if it belongs to the group.
   *
   * @param groupId - The group asking.
   * @param saleId - The sale.
   * @returns The sale with its buyer and cuotas, or null.
   */
  findInGroup(groupId: string, saleId: string): Promise<CreditSale | null>;

  /**
   * Lists a group's credit sales with their cuotas counted and added up.
   *
   * @param groupId - The group.
   * @param today - Today's date in Lima, to count overdue cuotas.
   * @returns One item per sale, newest first.
   */
  listItems(groupId: string, today: ISODate): Promise<CreditSaleListItem[]>;

  /**
   * Finds the credit sale a sell_on_credit movement booked.
   *
   * @param saleMovementId - The sell_on_credit movement.
   * @param groupId - When given, only a sale of this group is found.
   * @returns The sale's id, or null.
   */
  idBySaleMovement(
    saleMovementId: string,
    groupId?: string,
  ): Promise<string | null>;

  /**
   * Finds the cuota a collect_sale movement collected, only within the group.
   *
   * @param groupId - The group asking.
   * @param collectMovementId - The collect_sale movement.
   * @returns The sale and the cuota, or null.
   */
  findByCollectMovement(
    groupId: string,
    collectMovementId: string,
  ): Promise<{ saleId: string; installmentId: string } | null>;

  /**
   * Lists the collect_sale movements of a sale's collected cuotas.
   *
   * @param saleId - The sale.
   * @returns The movement ids.
   */
  collectMovementIdsOf(saleId: string): Promise<string[]>;

  /**
   * Marks a cuota collected, only if it is still pending.
   *
   * @param installmentId - The cuota.
   * @param collection - The collect_sale movement, the cost recovered and
   *   when it was collected.
   * @returns True when the cuota was pending and is now collected; false when
   *   someone collected it first.
   */
  markCollected(
    installmentId: string,
    collection: { movementId: string; costShare: number; collectedAt: Date },
  ): Promise<boolean>;

  /**
   * Puts a collected cuota back to pending.
   *
   * @param collectMovementId - The collect_sale movement of its cobro.
   */
  reopenByCollectMovement(collectMovementId: string): Promise<void>;

  /**
   * Swaps the pending cuotas of a sale for new ones.
   *
   * @param saleId - The sale.
   * @param installments - The new pending cuotas.
   */
  replacePending(
    saleId: string,
    installments: readonly CreditSaleInstallment[],
  ): Promise<void>;

  /**
   * Marks a sale voided.
   *
   * @param saleId - The sale.
   */
  void(saleId: string): Promise<void>;

  /**
   * Holds the sale until the unit of work ends, so no one collects, re-plans or voids it meanwhile.
   *
   * @param saleId - The sale.
   */
  lock(saleId: string): Promise<void>;
}

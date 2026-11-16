import { and, count, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import { Contacts } from "@/backend/modules/contacts/adapters/out/drizzle/contacts.table";
import type { CreditSale } from "@/backend/modules/inventory/domain/credit-sale";
import type { CreditSaleInstallment } from "@/backend/modules/inventory/domain/credit-sale-installment";
import type { CreditSaleListItem } from "@/backend/modules/inventory/domain/credit-sale-list-item";
import type { CreditSaleRepository } from "@/backend/modules/inventory/ports/credit-sale-repository";
import type { ISODate } from "@/lib/dates";
import { CreditSaleInstallments } from "./credit-sale-installments.table";
import { CreditSaleMapper } from "./credit-sale-mapper";
import { CreditSales } from "./credit-sales.table";

export class DrizzleCreditSaleRepository implements CreditSaleRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async add(sale: CreditSale): Promise<void> {
    await this.db.insert(CreditSales).values(CreditSaleMapper.toRow(sale));

    await this.db
      .insert(CreditSaleInstallments)
      .values(
        sale.installments.map((installment) =>
          CreditSaleMapper.toInstallmentRow(sale.id, installment),
        ),
      );
  }

  async findInGroup(
    groupId: string,
    saleId: string,
  ): Promise<CreditSale | null> {
    const [sale] = await this.withInstallments(
      and(eq(CreditSales.id, saleId), eq(CreditSales.groupId, groupId)),
    );

    return sale ?? null;
  }

  async listItems(
    groupId: string,
    today: ISODate,
  ): Promise<CreditSaleListItem[]> {
    const pending = sql`${CreditSaleInstallments.status} = 'pending'`;

    const pendingCount = sql<number>`count(${CreditSaleInstallments.id}) FILTER (WHERE ${pending})`;

    return this.db
      .select({
        id: CreditSales.id,
        buyerName: Contacts.name,
        item: CreditSales.item,
        status: CreditSales.status,
        collectedCount:
          sql<number>`count(${CreditSaleInstallments.id}) FILTER (WHERE NOT ${pending})`.mapWith(
            Number,
          ),
        totalCount: count(CreditSaleInstallments.id),
        overdueCount:
          sql<number>`CASE WHEN ${CreditSales.status} = 'voided' THEN 0 ELSE count(${CreditSaleInstallments.id}) FILTER (WHERE ${pending} AND ${CreditSaleInstallments.dueDate} < ${today}) END`.mapWith(
            Number,
          ),
        pendingAmount:
          sql<number>`coalesce(sum(${CreditSaleInstallments.amount}) FILTER (WHERE ${pending}), 0)`.mapWith(
            Number,
          ),
        settled: sql<boolean>`${pendingCount} = 0`.mapWith(Boolean),
      })
      .from(CreditSales)
      .innerJoin(Contacts, eq(Contacts.id, CreditSales.buyerId))
      .leftJoin(
        CreditSaleInstallments,
        eq(CreditSaleInstallments.saleId, CreditSales.id),
      )
      .where(eq(CreditSales.groupId, groupId))
      .groupBy(CreditSales.id, Contacts.name)
      .orderBy(desc(CreditSales.createdAt));
  }

  async idBySaleMovement(
    saleMovementId: string,
    groupId?: string,
  ): Promise<string | null> {
    const [row] = await this.db
      .select({ id: CreditSales.id })
      .from(CreditSales)
      .where(
        and(
          eq(CreditSales.saleMovementId, saleMovementId),
          groupId ? eq(CreditSales.groupId, groupId) : undefined,
        ),
      );

    return row?.id ?? null;
  }

  async findByCollectMovement(
    groupId: string,
    collectMovementId: string,
  ): Promise<{ saleId: string; installmentId: string } | null> {
    const [row] = await this.db
      .select({
        saleId: CreditSaleInstallments.saleId,
        installmentId: CreditSaleInstallments.id,
      })
      .from(CreditSaleInstallments)
      .innerJoin(CreditSales, eq(CreditSales.id, CreditSaleInstallments.saleId))
      .where(
        and(
          eq(CreditSaleInstallments.collectMovementId, collectMovementId),
          eq(CreditSales.groupId, groupId),
        ),
      );

    return row ?? null;
  }

  async collectMovementIdsOf(saleId: string): Promise<string[]> {
    const rows = await this.db
      .select({ movementId: CreditSaleInstallments.collectMovementId })
      .from(CreditSaleInstallments)
      .where(
        and(
          eq(CreditSaleInstallments.saleId, saleId),
          isNotNull(CreditSaleInstallments.collectMovementId),
        ),
      );

    return rows.map((row) => row.movementId).filter((id) => id !== null);
  }

  async markCollected(
    installmentId: string,
    collection: { movementId: string; costShare: number; collectedAt: Date },
  ): Promise<boolean> {
    const updated = await this.db
      .update(CreditSaleInstallments)
      .set({
        status: "collected",
        costShare: collection.costShare,
        collectedAt: collection.collectedAt,
        collectMovementId: collection.movementId,
      })
      .where(
        and(
          eq(CreditSaleInstallments.id, installmentId),
          eq(CreditSaleInstallments.status, "pending"),
        ),
      )
      .returning({ id: CreditSaleInstallments.id });

    return updated.length > 0;
  }

  async reopenByCollectMovement(collectMovementId: string): Promise<void> {
    await this.db
      .update(CreditSaleInstallments)
      .set({
        status: "pending",
        costShare: null,
        collectedAt: null,
        collectMovementId: null,
      })
      .where(eq(CreditSaleInstallments.collectMovementId, collectMovementId));
  }

  async replacePending(
    saleId: string,
    installments: readonly CreditSaleInstallment[],
  ): Promise<void> {
    await this.db
      .delete(CreditSaleInstallments)
      .where(
        and(
          eq(CreditSaleInstallments.saleId, saleId),
          eq(CreditSaleInstallments.status, "pending"),
        ),
      );

    await this.db
      .insert(CreditSaleInstallments)
      .values(
        installments.map((installment) =>
          CreditSaleMapper.toInstallmentRow(saleId, installment),
        ),
      );
  }

  async void(saleId: string): Promise<void> {
    await this.db
      .update(CreditSales)
      .set({ status: "voided" })
      .where(eq(CreditSales.id, saleId));
  }

  private async withInstallments(
    where: ReturnType<typeof and>,
  ): Promise<CreditSale[]> {
    const sales = await this.db
      .select({ sale: CreditSales, buyerName: Contacts.name })
      .from(CreditSales)
      .innerJoin(Contacts, eq(Contacts.id, CreditSales.buyerId))
      .where(where)
      .orderBy(desc(CreditSales.createdAt));

    if (sales.length === 0) {
      return [];
    }

    const installments = await this.db
      .select()
      .from(CreditSaleInstallments)
      .where(
        inArray(
          CreditSaleInstallments.saleId,
          sales.map((row) => row.sale.id),
        ),
      );

    return sales.map((row) =>
      CreditSaleMapper.toDomain(row.sale, row.buyerName, installments),
    );
  }

  async lock(saleId: string): Promise<void> {
    await this.db
      .select({ id: CreditSales.id })
      .from(CreditSales)
      .where(eq(CreditSales.id, saleId))
      .for("update");
  }
}

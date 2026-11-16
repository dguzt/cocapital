import { and, desc, eq, sql } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import { Users } from "@/backend/modules/accounts/adapters/out/drizzle/users.table";
import { Contacts } from "@/backend/modules/contacts/adapters/out/drizzle/contacts.table";
import type { PlanChange } from "@/backend/modules/inventory/domain/plan-change";
import type { PlanChangeEntry } from "@/backend/modules/inventory/domain/plan-change-entry";
import type { PlanChangeRepository } from "@/backend/modules/inventory/ports/plan-change-repository";
import type { PageRequest } from "@/lib/page";
import { CreditSalePlanChanges } from "./credit-sale-plan-changes.table";
import { CreditSales } from "./credit-sales.table";

export class DrizzlePlanChangeRepository implements PlanChangeRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async record(entry: PlanChangeEntry): Promise<void> {
    await this.db.insert(CreditSalePlanChanges).values(entry);
  }

  async listPage(groupId: string, page: PageRequest): Promise<PlanChange[]> {
    const olderThanAfter = page.after
      ? sql`(${CreditSalePlanChanges.createdAt}, ${CreditSalePlanChanges.id}) < (SELECT p.created_at, p.id FROM credit_sale_plan_changes p WHERE p.id = ${page.after})`
      : undefined;

    return this.db
      .select({
        id: CreditSalePlanChanges.id,
        saleId: CreditSalePlanChanges.saleId,
        buyerName: Contacts.name,
        item: CreditSales.item,
        fromCount: CreditSalePlanChanges.fromCount,
        toCount: CreditSalePlanChanges.toCount,
        authorName: Users.name,
        createdAt: CreditSalePlanChanges.createdAt,
      })
      .from(CreditSalePlanChanges)
      .innerJoin(CreditSales, eq(CreditSales.id, CreditSalePlanChanges.saleId))
      .innerJoin(Contacts, eq(Contacts.id, CreditSales.buyerId))
      .innerJoin(Users, eq(Users.id, CreditSalePlanChanges.userId))
      .where(and(eq(CreditSales.groupId, groupId), olderThanAfter))
      .orderBy(
        desc(CreditSalePlanChanges.createdAt),
        desc(CreditSalePlanChanges.id),
      )
      .limit(page.limit);
  }
}

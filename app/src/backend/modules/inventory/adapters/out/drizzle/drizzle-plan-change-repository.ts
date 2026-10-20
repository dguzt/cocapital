import { desc, eq } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import { Users } from "@/backend/modules/accounts/adapters/out/drizzle/users.table";
import { Contacts } from "@/backend/modules/contacts/adapters/out/drizzle/contacts.table";
import type { PlanChange } from "@/backend/modules/inventory/domain/plan-change";
import type { PlanChangeEntry } from "@/backend/modules/inventory/domain/plan-change-entry";
import type { PlanChangeRepository } from "@/backend/modules/inventory/ports/plan-change-repository";
import { CreditSalePlanChanges } from "./credit-sale-plan-changes.table";
import { CreditSales } from "./credit-sales.table";

export class DrizzlePlanChangeRepository implements PlanChangeRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async record(entry: PlanChangeEntry): Promise<void> {
    await this.db.insert(CreditSalePlanChanges).values(entry);
  }

  async listByGroup(groupId: string): Promise<PlanChange[]> {
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
      .where(eq(CreditSales.groupId, groupId))
      .orderBy(desc(CreditSalePlanChanges.createdAt));
  }
}

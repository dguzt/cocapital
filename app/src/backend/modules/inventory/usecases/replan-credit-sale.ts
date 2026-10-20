import type { CreditSaleError } from "@/backend/modules/inventory/domain/errors";
import type { PlannedInstallment } from "@/backend/modules/inventory/domain/planned-installment";
import type { CreditSaleRepository } from "@/backend/modules/inventory/ports/credit-sale-repository";
import type { PlanChangeRepository } from "@/backend/modules/inventory/ports/plan-change-repository";
import type { UnitOfWork } from "@/backend/shared/ports/unit-of-work";
import { err, ok, type Result } from "@/lib/result";

export type ReplanCreditSaleInput = {
  groupId: string;
  userId: string;
  saleId: string;
  installments: readonly PlannedInstallment[];
};

/**
 * Rewrites the pending cuotas of a credit sale. Money does not move, so it
 * needs no partner's OK; the rewrite is recorded for the activity.
 */
export class ReplanCreditSale {
  static inject = ["creditSales", "planChanges", "uow"] as const;

  constructor(
    private readonly creditSales: CreditSaleRepository,
    private readonly planChanges: PlanChangeRepository,
    private readonly uow: UnitOfWork,
  ) {}

  /**
   * Swaps the pending cuotas and records the rewrite, all or nothing.
   *
   * @param input - The group, the partner, the sale and its new pending cuotas.
   * @returns How many pending cuotas there were and are, or
   *   `CreditSaleNotFound`, `CreditSaleVoided`, `InvalidInstallments` or
   *   `ScheduleMismatch`.
   */
  async execute(
    input: ReplanCreditSaleInput,
  ): Promise<Result<{ fromCount: number; toCount: number }, CreditSaleError>> {
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

    const replan = sale.replan(input.installments);

    if (!replan.ok) {
      return replan;
    }

    const { installments, fromCount, toCount } = replan.value;

    return this.uow.run(async () => {
      await this.creditSales.replacePending(sale.id, installments);

      await this.planChanges.record({
        saleId: sale.id,
        userId: input.userId,
        fromCount,
        toCount,
      });

      return ok({ fromCount, toCount });
    });
  }
}

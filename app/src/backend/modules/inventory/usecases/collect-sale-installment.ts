import type { CreditSaleError } from "@/backend/modules/inventory/domain/errors";
import type { CreditSaleRepository } from "@/backend/modules/inventory/ports/credit-sale-repository";
import type { AddMovement } from "@/backend/modules/movements/usecases/add-movement";
import type { UnitOfWork } from "@/backend/shared/ports/unit-of-work";
import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";

export type CollectSaleInstallmentInput = {
  groupId: string;
  userId: string;
  saleId: string;
  installmentId: string;
  today: ISODate;
};

/**
 * Collects one cuota of a credit sale: its amount enters cash as a
 * collect_sale movement that keeps the cost recovered in `cost`, so the
 * capital can tell the margin apart.
 */
export class CollectSaleInstallment {
  static inject = ["creditSales", "addMovement", "uow"] as const;

  constructor(
    private readonly creditSales: CreditSaleRepository,
    private readonly addMovement: AddMovement,
    private readonly uow: UnitOfWork,
  ) {}

  /**
   * Books the collect_sale movement and marks the cuota collected, all or
   * nothing. When two partners collect the same cuota at once, only one
   * succeeds.
   *
   * @param input - The group, the collecting partner, the sale, the cuota and
   *   today's date.
   * @returns The amount collected and the margin earned, or
   *   `CreditSaleNotFound`, `CreditSaleVoided` or `InstallmentNotCollectable`.
   */
  async execute(
    input: CollectSaleInstallmentInput,
  ): Promise<Result<{ amount: Cents; margin: Cents }, CreditSaleError>> {
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

    const collection = sale.collect(input.installmentId);

    if (!collection.ok) {
      return collection;
    }

    const { installment, costShare } = collection.value;

    return this.uow.run(async () => {
      const movement = await this.addMovement.execute({
        groupId: input.groupId,
        userId: input.userId,
        type: "collect_sale",
        amount: installment.amount,
        cost: costShare,
        concept: `${sale.buyer.name} · ${sale.item} · ${installment.number === 0 ? "inicial" : `cuota ${installment.number}`}`,
        date: input.today,
      });

      const collected = await this.creditSales.markCollected(installment.id, {
        movementId: movement.id,
        costShare,
        collectedAt: new Date(),
      });

      if (!collected) {
        return err({
          kind: "InstallmentNotCollectable",
          message: "installment was already collected",
          installmentId: installment.id,
        });
      }

      return ok({
        amount: installment.amount,
        margin: installment.amount - costShare,
      });
    });
  }
}

import type { ContactError } from "@/backend/modules/contacts/domain/contact-error";
import type { ResolveContact } from "@/backend/modules/contacts/usecases/resolve-contact";
import { CreditSale } from "@/backend/modules/inventory/domain/credit-sale";
import { CreditSalePlan } from "@/backend/modules/inventory/domain/credit-sale-plan";
import type { CreditSaleError } from "@/backend/modules/inventory/domain/errors";
import type { NewCreditSale } from "@/backend/modules/inventory/domain/new-credit-sale";
import type { CreditSaleRepository } from "@/backend/modules/inventory/ports/credit-sale-repository";
import type { AddMovement } from "@/backend/modules/movements/usecases/add-movement";
import type { UnitOfWork } from "@/backend/shared/ports/unit-of-work";
import { err, ok, type Result } from "@/lib/result";
import type { CollectSaleInstallment } from "./collect-sale-installment";

export type CreateCreditSaleInput = NewCreditSale & {
  groupId: string;
  userId: string;
};

type CreateCreditSaleError = CreditSaleError | ContactError;

/**
 * Sells goods to a contact on credit. The cost leaves inventory and counts as
 * receivable; the margin only enters the capital as each cuota is collected.
 */
export class CreateCreditSale {
  static inject = [
    "creditSales",
    "resolveContact",
    "addMovement",
    "collectSaleInstallment",
    "uow",
  ] as const;

  constructor(
    private readonly creditSales: CreditSaleRepository,
    private readonly resolveContact: ResolveContact,
    private readonly addMovement: AddMovement,
    private readonly collectSaleInstallment: CollectSaleInstallment,
    private readonly uow: UnitOfWork,
  ) {}

  /**
   * Stores the buyer when new, the sell_on_credit movement, the sale and its
   * cuotas, and collects the down payment, all or nothing.
   *
   * @param input - The sale as built in the form, its group and the selling
   *   partner.
   * @returns The new sale's id, or why the sale is not valid.
   */
  async execute(
    input: CreateCreditSaleInput,
  ): Promise<Result<{ saleId: string }, CreateCreditSaleError>> {
    const item = input.item.trim();

    if (!item) {
      return err({
        kind: "ItemRequired",
        message: "a credit sale needs to say what was sold",
      });
    }

    const plan = CreditSalePlan.of(input);

    if (!plan.ok) {
      return plan;
    }

    return this.uow.run<{ saleId: string }, CreateCreditSaleError>(async () => {
      const buyer = await this.resolveContact.execute({
        groupId: input.groupId,
        choice: input.buyer,
      });

      if (!buyer.ok) {
        return buyer;
      }

      const movement = await this.addMovement.execute({
        groupId: input.groupId,
        userId: input.userId,
        type: "sell_on_credit",
        amount: plan.value.price,
        cost: plan.value.cost,
        concept: `${buyer.value.name} · ${item}`,
        date: input.startDate,
      });

      const sale = CreditSale.create({
        groupId: input.groupId,
        userId: input.userId,
        buyer: { id: buyer.value.contactId, name: buyer.value.name },
        item,
        plan: plan.value,
        frequency: input.frequency,
        startDate: input.startDate,
        saleMovementId: movement.id,
      });

      await this.creditSales.add(sale);

      const downPayment = sale.installments.find((row) => row.number === 0);

      if (downPayment) {
        const collected = await this.collectSaleInstallment.execute({
          groupId: input.groupId,
          userId: input.userId,
          saleId: sale.id,
          installmentId: downPayment.id,
          today: input.startDate,
        });

        if (!collected.ok) {
          return collected;
        }
      }

      return ok({ saleId: sale.id });
    });
  }
}

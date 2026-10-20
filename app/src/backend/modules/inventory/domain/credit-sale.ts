import * as R from "remeda";

import { type Frequency, type ISODate, isOverdue } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";
import type { CreditSaleInstallment } from "./credit-sale-installment";
import { CreditSalePlan } from "./credit-sale-plan";
import type { CreditSaleSnapshot } from "./credit-sale-snapshot";
import type { CreditSaleStatus } from "./credit-sale-status";
import type { CreditSaleError } from "./errors";
import type { PlannedInstallment } from "./planned-installment";

/** A cuota ready to be collected and the part of it that recovers cost. */
export type Collection = {
  installment: CreditSaleInstallment;
  costShare: Cents;
};

/** The pending cuotas that replace the old ones, and how many there were. */
export type Replan = {
  installments: CreditSaleInstallment[];
  fromCount: number;
  toCount: number;
};

/**
 * Goods sold to a contact and paid in cuotas. The cost is recovered and the
 * margin earned in proportion to each cuota collected.
 */
export class CreditSale {
  private constructor(
    readonly id: string,
    readonly groupId: string,
    readonly userId: string,
    readonly buyer: { id: string; name: string },
    readonly item: string,
    readonly price: Cents,
    readonly cost: Cents | null,
    readonly frequency: Frequency,
    readonly startDate: ISODate,
    readonly status: CreditSaleStatus,
    readonly saleMovementId: string,
    readonly installments: readonly CreditSaleInstallment[],
  ) {}

  /**
   * Books a new credit sale. The down payment, when there is one, becomes
   * cuota 0 due on the start date.
   *
   * @param entry - The group, the selling partner, the buyer, the item, the
   *   validated plan, the frequency, the start date and the sell_on_credit
   *   movement that booked it.
   * @returns The sale with fresh ids and every cuota pending.
   */
  static create(entry: {
    groupId: string;
    userId: string;
    buyer: { id: string; name: string };
    item: string;
    plan: CreditSalePlan;
    frequency: Frequency;
    startDate: ISODate;
    saleMovementId: string;
  }): CreditSale {
    const { plan } = entry;

    const downPayment: PlannedInstallment[] =
      plan.downPayment > 0
        ? [{ dueDate: entry.startDate, amount: plan.downPayment }]
        : [];

    const firstNumber = plan.downPayment > 0 ? 0 : 1;

    const installments = [...downPayment, ...plan.installments].map(
      (row, index) => CreditSale.pending(row, firstNumber + index),
    );

    return new CreditSale(
      crypto.randomUUID(),
      entry.groupId,
      entry.userId,
      entry.buyer,
      entry.item.trim(),
      plan.price,
      plan.cost,
      entry.frequency,
      entry.startDate,
      "active",
      entry.saleMovementId,
      installments,
    );
  }

  /**
   * Rebuilds a credit sale that already exists, without re-checking its rules.
   *
   * @param snapshot - Every field of the sale, already valid.
   * @returns The same sale.
   */
  static restore(snapshot: CreditSaleSnapshot): CreditSale {
    return new CreditSale(
      snapshot.id,
      snapshot.groupId,
      snapshot.userId,
      snapshot.buyer,
      snapshot.item,
      snapshot.price,
      snapshot.cost,
      snapshot.frequency,
      snapshot.startDate,
      snapshot.status,
      snapshot.saleMovementId,
      R.sortBy(snapshot.installments, (installment) => installment.number),
    );
  }

  /**
   * The cuotas still waiting to be paid.
   *
   * @returns The pending cuotas, in order.
   */
  pendingInstallments(): CreditSaleInstallment[] {
    return this.installments.filter(
      (installment) => installment.status === "pending",
    );
  }

  /**
   * The cuotas already paid.
   *
   * @returns The collected cuotas, in order.
   */
  collectedInstallments(): CreditSaleInstallment[] {
    return this.installments.filter(
      (installment) => installment.status === "collected",
    );
  }

  /**
   * What the buyer still owes.
   *
   * @returns The sum of the pending cuotas.
   */
  pendingAmount(): Cents {
    return R.sumBy(this.pendingInstallments(), (row) => row.amount);
  }

  /**
   * What the buyer already paid.
   *
   * @returns The sum of the collected cuotas.
   */
  collectedAmount(): Cents {
    return R.sumBy(this.collectedInstallments(), (row) => row.amount);
  }

  /**
   * The whole margin of the sale.
   *
   * @returns Price minus cost; 0 when the cost was not given.
   */
  expectedMargin(): Cents {
    return this.price - (this.cost ?? this.price);
  }

  /**
   * Tells whether the buyer paid everything.
   *
   * @returns True when no cuota is pending.
   */
  isSettled(): boolean {
    return this.pendingInstallments().length === 0;
  }

  /**
   * Counts the cuotas past their due date.
   *
   * @param today - Today's date in Lima.
   * @returns How many pending cuotas fell due before today; 0 for a voided sale.
   */
  overdueCount(today: ISODate): number {
    if (this.status === "voided") {
      return 0;
    }

    return this.pendingInstallments().filter((installment) =>
      isOverdue(installment.dueDate, today),
    ).length;
  }

  /**
   * Prepares the cobro of one cuota. The cost recovered is the cuota's share
   * of cost/price, rounded; the cuota that settles the sale takes whatever
   * cost is left, so the cost recovered always adds up to the cost.
   *
   * @param installmentId - The cuota to collect.
   * @returns The cuota and its cost share, or `CreditSaleVoided` or
   *   `InstallmentNotCollectable`.
   */
  collect(installmentId: string): Result<Collection, CreditSaleError> {
    if (this.status === "voided") {
      return err({
        kind: "CreditSaleVoided",
        message: "the credit sale is voided",
        saleId: this.id,
      });
    }

    const installment = this.installments.find(
      (candidate) => candidate.id === installmentId,
    );

    if (!installment || installment.status !== "pending") {
      return err({
        kind: "InstallmentNotCollectable",
        message: "installment missing or already collected",
        installmentId,
      });
    }

    return ok({ installment, costShare: this.costShareOf(installment) });
  }

  /**
   * Rewrites the pending cuotas: to stretch the plan, or to split a cuota
   * the buyer pays in parts. The new cuotas must add up to what is pending.
   *
   * @param planned - The new pending cuotas, in order.
   * @returns The cuotas to store, numbered after every collected one, or
   *   `CreditSaleVoided`, `InvalidInstallments` or `ScheduleMismatch`.
   */
  replan(
    planned: readonly PlannedInstallment[],
  ): Result<Replan, CreditSaleError> {
    if (this.status === "voided") {
      return err({
        kind: "CreditSaleVoided",
        message: "the credit sale is voided",
        saleId: this.id,
      });
    }

    const broken = CreditSalePlan.brokenRule(planned);

    if (broken) {
      return err({
        kind: "InvalidInstallments",
        message: `invalid installments: ${broken}`,
        reason: broken,
      });
    }

    const scheduled = R.sumBy(planned, (row) => row.amount);

    const pending = this.pendingAmount();

    if (scheduled !== pending) {
      return err({
        kind: "ScheduleMismatch",
        message: `the new installments (${scheduled}) must add up to what is pending (${pending})`,
        scheduled,
        expected: pending,
      });
    }

    const lastCollected = Math.max(
      0,
      ...this.collectedInstallments().map((installment) => installment.number),
    );

    return ok({
      installments: planned.map((row, index) =>
        CreditSale.pending(row, lastCollected + index + 1),
      ),
      fromCount: this.pendingInstallments().length,
      toCount: planned.length,
    });
  }

  private costShareOf(installment: CreditSaleInstallment): Cents {
    if (this.cost === null) {
      return installment.amount;
    }

    const isLast = this.pendingInstallments().length === 1;

    if (isLast) {
      const recovered = R.sumBy(
        this.collectedInstallments(),
        (row) => row.costShare ?? 0,
      );

      return this.cost - recovered;
    }

    return Math.round((installment.amount * this.cost) / this.price);
  }

  private static pending(
    row: PlannedInstallment,
    number: number,
  ): CreditSaleInstallment {
    return {
      id: crypto.randomUUID(),
      number,
      dueDate: row.dueDate,
      amount: row.amount,
      status: "pending",
      costShare: null,
      collectMovementId: null,
    };
  }
}

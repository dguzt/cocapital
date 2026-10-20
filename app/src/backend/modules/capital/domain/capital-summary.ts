import * as R from "remeda";

import type { Cents } from "@/lib/money";
import type { CapitalInstallment } from "./capital-installment";
import type { CapitalMovement } from "./capital-movement";

type Buckets = {
  cash: Cents;
  inventory: Cents;
  receivable: Cents;
  salesProfit: Cents;
  expectedSalesMargin: Cents;
};

const NO_CHANGE: Buckets = {
  cash: 0,
  inventory: 0,
  receivable: 0,
  salesProfit: 0,
  expectedSalesMargin: 0,
};

/** Where the group's capital is. Total is always cash + inventory + lent + receivable. */
export class CapitalSummary {
  private constructor(
    readonly total: Cents,
    readonly cash: Cents,
    readonly inventory: Cents,
    readonly lent: Cents,
    /** Cost of goods sold on credit not recovered yet. */
    readonly receivable: Cents,
    /** Profit from sales: sale price minus cost of goods, as it is collected. */
    readonly salesProfit: Cents,
    readonly collectedInterest: Cents,
    /** Interest not collected yet; shown apart, never part of the total. */
    readonly expectedInterest: Cents,
    /** Margin of credit sales not collected yet; shown apart, never part of the total. */
    readonly expectedSalesMargin: Cents,
  ) {}

  /**
   * Derives the capital from the ledger and the loans' cuotas. Voided
   * movements count for nothing; pending principal is lent; unrecovered cost
   * of credit sales is receivable; interest and margin enter the total only
   * once collected.
   *
   * @param movements - Every movement of the group.
   * @param installments - Every cuota of its live loans.
   * @returns The capital summary.
   */
  static derive(
    movements: readonly CapitalMovement[],
    installments: readonly CapitalInstallment[],
  ): CapitalSummary {
    const { cash, inventory, receivable, salesProfit, expectedSalesMargin } =
      R.pipe(
        movements,
        R.filter((movement) => movement.status !== "voided"),
        R.map(CapitalSummary.deltaOf),
        R.reduce(CapitalSummary.add, NO_CHANGE),
      );

    const [collected, outstanding] = R.partition(
      installments,
      (installment) => installment.status === "collected",
    );

    const lent = R.sumBy(outstanding, (installment) => installment.principal);

    return new CapitalSummary(
      cash + inventory + lent + receivable,
      cash,
      inventory,
      lent,
      receivable,
      salesProfit,
      R.sumBy(collected, (installment) => installment.interest),
      R.sumBy(outstanding, (installment) => installment.interest),
      expectedSalesMargin,
    );
  }

  private static deltaOf(movement: CapitalMovement): Buckets {
    const cost = movement.cost ?? movement.amount;

    const margin = movement.amount - cost;

    switch (movement.type) {
      case "contribute":
      case "repay":
        return { ...NO_CHANGE, cash: movement.amount };
      case "expense":
      case "lend":
        return { ...NO_CHANGE, cash: -movement.amount };
      case "buy_inventory":
        return {
          ...NO_CHANGE,
          cash: -movement.amount,
          inventory: movement.amount,
        };
      case "sell_inventory":
        return {
          ...NO_CHANGE,
          cash: movement.amount,
          inventory: -cost,
          salesProfit: margin,
        };
      case "sell_on_credit":
        return {
          ...NO_CHANGE,
          inventory: -cost,
          receivable: cost,
          expectedSalesMargin: margin,
        };
      case "collect_sale":
        return {
          ...NO_CHANGE,
          cash: movement.amount,
          receivable: -cost,
          salesProfit: margin,
          expectedSalesMargin: -margin,
        };
    }
  }

  private static add(a: Buckets, b: Buckets): Buckets {
    return {
      cash: a.cash + b.cash,
      inventory: a.inventory + b.inventory,
      receivable: a.receivable + b.receivable,
      salesProfit: a.salesProfit + b.salesProfit,
      expectedSalesMargin: a.expectedSalesMargin + b.expectedSalesMargin,
    };
  }
}

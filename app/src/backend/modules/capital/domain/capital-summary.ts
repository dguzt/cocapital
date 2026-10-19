import * as R from "remeda";

import type { Cents } from "@/lib/money";
import type { CapitalInstallment } from "./capital-installment";
import type { CapitalMovement } from "./capital-movement";

type Buckets = { cash: Cents; inventory: Cents; salesProfit: Cents };

/** Where the group's capital is. Total is always cash + inventory + lent. */
export class CapitalSummary {
  private constructor(
    readonly total: Cents,
    readonly cash: Cents,
    readonly inventory: Cents,
    readonly lent: Cents,
    /** Profit from sales: sale price minus cost of goods. */
    readonly salesProfit: Cents,
    readonly collectedInterest: Cents,
    /** Interest not collected yet; shown apart, never part of the total. */
    readonly expectedInterest: Cents,
  ) {}

  /**
   * Derives the capital from the ledger and the loans' cuotas. Voided
   * movements count for nothing; pending principal is lent; interest enters
   * the total only once collected.
   *
   * @param movements - Every movement of the group.
   * @param installments - Every cuota of its live loans.
   * @returns The capital summary.
   */
  static derive(
    movements: readonly CapitalMovement[],
    installments: readonly CapitalInstallment[],
  ): CapitalSummary {
    const { cash, inventory, salesProfit } = R.pipe(
      movements,
      R.filter((movement) => movement.status !== "voided"),
      R.map(CapitalSummary.deltaOf),
      R.reduce(CapitalSummary.add, { cash: 0, inventory: 0, salesProfit: 0 }),
    );

    const [collected, outstanding] = R.partition(
      installments,
      (installment) => installment.status === "collected",
    );

    const lent = R.sumBy(outstanding, (installment) => installment.principal);

    return new CapitalSummary(
      cash + inventory + lent,
      cash,
      inventory,
      lent,
      salesProfit,
      R.sumBy(collected, (installment) => installment.interest),
      R.sumBy(outstanding, (installment) => installment.interest),
    );
  }

  private static deltaOf(movement: CapitalMovement): Buckets {
    const cost = movement.cost ?? movement.amount;

    switch (movement.type) {
      case "contribute":
      case "repay":
        return { cash: movement.amount, inventory: 0, salesProfit: 0 };
      case "expense":
      case "lend":
        return { cash: -movement.amount, inventory: 0, salesProfit: 0 };
      case "buy_inventory":
        return {
          cash: -movement.amount,
          inventory: movement.amount,
          salesProfit: 0,
        };
      case "sell_inventory":
        return {
          cash: movement.amount,
          inventory: -cost,
          salesProfit: movement.amount - cost,
        };
    }
  }

  private static add(a: Buckets, b: Buckets): Buckets {
    return {
      cash: a.cash + b.cash,
      inventory: a.inventory + b.inventory,
      salesProfit: a.salesProfit + b.salesProfit,
    };
  }
}

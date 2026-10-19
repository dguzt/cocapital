import * as R from "remeda";
import type {
  MovementStatus,
  MovementType,
} from "@/backend/modules/movements/domain/movement";
import type { Cents } from "@/lib/money";

/** What the capital needs from a movement. */
export type CapitalMovement = {
  type: MovementType;
  amount: Cents;
  /** Cost of goods of a sale; null means no margin. */
  cost: Cents | null;
  status: MovementStatus;
};

/** What the capital needs from a cuota. */
export type CapitalInstallment = {
  principal: Cents;
  interest: Cents;
  status: "pending" | "collected";
};

/** Where the group's capital is. Total is always cash + inventory + lent. */
export type CapitalSummary = {
  total: Cents;
  cash: Cents;
  inventory: Cents;
  lent: Cents;
  /** Profit from sales: sale price minus cost of goods. */
  salesProfit: Cents;
  collectedInterest: Cents;
  /** Interest not collected yet; shown apart, never part of the total. */
  expectedInterest: Cents;
};

type Buckets = { cash: Cents; inventory: Cents; salesProfit: Cents };

function movementDelta(m: CapitalMovement): Buckets {
  const cost = m.cost ?? m.amount;
  switch (m.type) {
    case "contribute":
      return { cash: m.amount, inventory: 0, salesProfit: 0 };
    case "expense":
      return { cash: -m.amount, inventory: 0, salesProfit: 0 };
    case "buy_inventory":
      return { cash: -m.amount, inventory: m.amount, salesProfit: 0 };
    case "sell_inventory":
      return {
        cash: m.amount,
        inventory: -cost,
        salesProfit: m.amount - cost,
      };
    case "lend":
      return { cash: -m.amount, inventory: 0, salesProfit: 0 };
    case "repay":
      return { cash: m.amount, inventory: 0, salesProfit: 0 };
  }
}

const addBuckets = (a: Buckets, b: Buckets): Buckets => ({
  cash: a.cash + b.cash,
  inventory: a.inventory + b.inventory,
  salesProfit: a.salesProfit + b.salesProfit,
});

/**
 * Derives the capital from the ledger and the loans' cuotas. Voided
 * movements count for nothing; pending principal is lent; interest enters
 * the total only once collected.
 *
 * @param movements - Every movement of the group.
 * @param installments - Every cuota of its live loans.
 * @returns The capital summary.
 */
export function deriveCapital(
  movements: CapitalMovement[],
  installments: CapitalInstallment[],
): CapitalSummary {
  const { cash, inventory, salesProfit } = R.pipe(
    movements,
    R.filter((m) => m.status !== "voided"),
    R.map(movementDelta),
    R.reduce(addBuckets, { cash: 0, inventory: 0, salesProfit: 0 }),
  );

  const [collected, outstanding] = R.partition(
    installments,
    (i) => i.status === "collected",
  );
  const lent = R.sumBy(outstanding, (i) => i.principal);
  const collectedInterest = R.sumBy(collected, (i) => i.interest);
  const expectedInterest = R.sumBy(outstanding, (i) => i.interest);

  return {
    total: cash + inventory + lent,
    cash,
    inventory,
    lent,
    salesProfit,
    collectedInterest,
    expectedInterest,
  };
}

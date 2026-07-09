/**
 * Capital read-model (TASK-201, M5). Pure reducer — zero tables, zero writes.
 * Identity: total = cash + inventory + lent. Realized-only (D3 #5): expected
 * interest NEVER enters the total; collected interest enters it through cash
 * the moment an installment is collected.
 * UI labels: cash=Efectivo · inventory=Inventario · lent=Prestado ·
 * collectedInterest=ganancia cobrada · expectedInterest=ganancia esperada.
 */
import * as R from "remeda";
import type { Cents } from "@/lib/money";
import type {
  MovementStatus,
  MovementType,
} from "../../movements/domain/movement";

export type CapitalMovement = {
  type: MovementType;
  amount: Cents;
  /** sell_inventory only: cost of goods. null ⇒ cost = amount (margin 0). */
  cost: Cents | null;
  status: MovementStatus;
};

export type CapitalInstallment = {
  principal: Cents;
  interest: Cents;
  status: "pending" | "collected";
};

export type CapitalSummary = {
  total: Cents;
  cash: Cents;
  inventory: Cents;
  lent: Cents;
  /** "Ganancia por ventas": Σ(sale − cost) of sells with a cost. */
  salesProfit: Cents;
  collectedInterest: Cents;
  /** Info only — never part of total (D3 #5). */
  expectedInterest: Cents;
};

type Buckets = { cash: Cents; inventory: Cents; salesProfit: Cents };

/** Each movement's delta on the buckets — the whole ledger folds over this. */
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
      // Cash in at sale price; inventory out at cost. The margin lands in
      // total automatically via the identity.
      return {
        cash: m.amount,
        inventory: -cost,
        salesProfit: m.amount - cost,
      };
    case "lend":
      // Principal only (D3 #5) — total unchanged, money changes bucket.
      return { cash: -m.amount, inventory: 0, salesProfit: 0 };
    case "repay":
      // Full installment (principal + interest) comes back as cash.
      return { cash: m.amount, inventory: 0, salesProfit: 0 };
  }
}

const addBuckets = (a: Buckets, b: Buckets): Buckets => ({
  cash: a.cash + b.cash,
  inventory: a.inventory + b.inventory,
  salesProfit: a.salesProfit + b.salesProfit,
});

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

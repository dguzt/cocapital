/**
 * Capital read-model (TASK-201, M5). Pure reducer — zero tables, zero writes.
 * Identity: total = cash + inventory + lent. Realized-only (D3 #5): expected
 * interest NEVER enters the total; collected interest enters it through cash
 * the moment an installment is collected.
 * UI labels: cash=Efectivo · inventory=Inventario · lent=Prestado ·
 * collectedInterest=ganancia cobrada · expectedInterest=ganancia esperada.
 */
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
  collectedInterest: Cents;
  /** Info only — never part of total (D3 #5). */
  expectedInterest: Cents;
};

export function deriveCapital(
  movements: CapitalMovement[],
  installments: CapitalInstallment[],
): CapitalSummary {
  let cash = 0;
  let inventory = 0;

  for (const m of movements) {
    if (m.status === "voided") continue;
    switch (m.type) {
      case "contribute":
        cash += m.amount;
        break;
      case "expense":
        cash -= m.amount;
        break;
      case "buy_inventory":
        cash -= m.amount;
        inventory += m.amount;
        break;
      case "sell_inventory":
        // Cash in at sale price; inventory out at cost. The difference
        // (margin) lands in total automatically via the identity.
        cash += m.amount;
        inventory -= m.cost ?? m.amount;
        break;
      case "lend":
        // Principal only (D3 #5) — total unchanged, money changes bucket.
        cash -= m.amount;
        break;
      case "repay":
        // Full installment (principal + interest) comes back as cash.
        cash += m.amount;
        break;
    }
  }

  let lent = 0;
  let collectedInterest = 0;
  let expectedInterest = 0;
  for (const i of installments) {
    if (i.status === "collected") {
      collectedInterest += i.interest;
    } else {
      lent += i.principal;
      expectedInterest += i.interest;
    }
  }

  return {
    total: cash + inventory + lent,
    cash,
    inventory,
    lent,
    collectedInterest,
    expectedInterest,
  };
}

/**
 * Capital read-model (TASK-201, M5). Pure reducer — zero tables, zero writes.
 * Identity: total = efectivo + inventario + prestado. Realized-only (D3 #5):
 * expected interest NEVER enters the total; collected interest enters it
 * through cash the moment a cuota is cobrada.
 */
import type { Centimos } from "@/lib/money";
import type {
  MovementStatus,
  MovementType,
} from "../../movements/domain/movement";

export type CapitalMovement = {
  type: MovementType;
  amount: Centimos;
  /** sell_inventory only: cost of goods. null ⇒ cost = amount (margin 0). */
  costo: Centimos | null;
  status: MovementStatus;
};

export type CapitalInstallment = {
  principal: Centimos;
  interest: Centimos;
  status: "pendiente" | "cobrada";
};

export type CapitalSummary = {
  total: Centimos;
  efectivo: Centimos;
  inventario: Centimos;
  prestado: Centimos;
  gananciaCobrada: Centimos;
  /** Info only — never part of total (D3 #5). */
  gananciaEsperada: Centimos;
};

export function deriveCapital(
  movements: CapitalMovement[],
  installments: CapitalInstallment[],
): CapitalSummary {
  let efectivo = 0;
  let inventario = 0;

  for (const m of movements) {
    if (m.status === "voided") continue;
    switch (m.type) {
      case "contribute":
        efectivo += m.amount;
        break;
      case "expense":
        efectivo -= m.amount;
        break;
      case "buy_inventory":
        efectivo -= m.amount;
        inventario += m.amount;
        break;
      case "sell_inventory":
        // Cash in at sale price; inventory out at cost. The difference
        // (margin) lands in total automatically via the identity.
        efectivo += m.amount;
        inventario -= m.costo ?? m.amount;
        break;
      case "lend":
        // Principal only (D3 #5) — total unchanged, money changes bucket.
        efectivo -= m.amount;
        break;
      case "repay":
        // Full cuota (principal + interest) comes back as cash.
        efectivo += m.amount;
        break;
    }
  }

  let prestado = 0;
  let gananciaCobrada = 0;
  let gananciaEsperada = 0;
  for (const i of installments) {
    if (i.status === "cobrada") {
      gananciaCobrada += i.interest;
    } else {
      prestado += i.principal;
      gananciaEsperada += i.interest;
    }
  }

  return {
    total: efectivo + inventario + prestado,
    efectivo,
    inventario,
    prestado,
    gananciaCobrada,
    gananciaEsperada,
  };
}

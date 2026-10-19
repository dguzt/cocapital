import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";

/** Every kind of movement the ledger knows. */
export const MOVEMENT_TYPES = [
  "contribute",
  "buy_inventory",
  "sell_inventory",
  "lend",
  "repay",
  "expense",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** The kinds a partner can type by hand; loans write lend and repay. */
export const MANUAL_MOVEMENT_TYPES = [
  "contribute",
  "buy_inventory",
  "sell_inventory",
  "expense",
] as const satisfies readonly MovementType[];

export type MovementStatus = "active" | "voided";

/** The fields of a movement an edit can change. */
export type MovementSnapshot = {
  type: MovementType;
  amount: Cents;
  /** Cost of goods for sell_inventory (optional; null ⇒ cost = amount, margin 0). */
  cost: Cents | null;
  concept: string | null;
  /** Calendar date the event belongs to (Lima). */
  date: ISODate;
};

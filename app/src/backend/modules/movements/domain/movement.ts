import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";

/** Fixed list — vision decision #3. lend/repay are auto-written by M4. */
export const MOVEMENT_TYPES = [
  "contribute",
  "buy_inventory",
  "sell_inventory",
  "lend",
  "repay",
  "expense",
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

/** Types a user can hand-enter from the "+" sheet (lend/repay go via M4 flows). */
export const MANUAL_MOVEMENT_TYPES = [
  "contribute",
  "buy_inventory",
  "sell_inventory",
  "expense",
] as const satisfies readonly MovementType[];

export type MovementStatus = "active" | "voided";

/** The editable surface of a movement — what an E4 edit can change. */
export type MovementSnapshot = {
  type: MovementType;
  amount: Cents;
  /** Cost of goods for sell_inventory (optional; null ⇒ cost = amount, margin 0). */
  cost: Cents | null;
  concept: string | null;
  /** Calendar date the event belongs to (Lima). */
  date: ISODate;
};

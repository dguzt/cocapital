import type { Cents } from "@/lib/money";
import type { MovementStatus, MovementType } from "./movement";

/** Every movement of one type and status, added up. */
export type MovementTotal = {
  type: MovementType;
  status: MovementStatus;
  amount: Cents;
  /** Each movement's cost of goods, or its amount when it has none. */
  cost: Cents;
};

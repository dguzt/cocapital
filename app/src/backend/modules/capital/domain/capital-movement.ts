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

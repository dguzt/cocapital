import type { Cents } from "@/lib/money";

/** What a partner may change in a movement: its amount, concept and, for a sale of inventory, its cost. */
export type MovementEdit = {
  amount: Cents;
  cost: Cents | null;
  concept: string | null;
};

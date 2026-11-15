import type { MovementType } from "@/backend/modules/movements/domain/movement";

export type Direction = "in" | "out" | "move";

/** How each movement type moves money, and a sample amount for its input. */
export const MOVEMENT_META: Record<
  MovementType,
  { dir: Direction; amountPlaceholder: string }
> = {
  contribute: { dir: "in", amountPlaceholder: "500.00" },
  buy_inventory: { dir: "move", amountPlaceholder: "480.00" },
  sell_inventory: { dir: "in", amountPlaceholder: "210.00" },
  lend: { dir: "move", amountPlaceholder: "300.00" },
  repay: { dir: "in", amountPlaceholder: "82.50" },
  sell_on_credit: { dir: "move", amountPlaceholder: "100.00" },
  collect_sale: { dir: "in", amountPlaceholder: "20.00" },
  expense: { dir: "out", amountPlaceholder: "15.00" },
};

export const DIR_BADGE: Record<Direction, string> = {
  in: "bg-emerald-400/15 text-emerald-400",
  out: "bg-red-400/15 text-red-400",
  move: "bg-secondary text-muted-foreground",
};

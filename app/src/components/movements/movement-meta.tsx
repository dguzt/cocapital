/** Shared Spanish presentation for movement types (labels/hints per design). */
import type { MovementType } from "@/backend/modules/movements/domain/movement";

export type Direction = "in" | "out" | "move";

export const MOVEMENT_META: Record<
  MovementType,
  { label: string; hint: string; dir: Direction }
> = {
  contribute: { label: "Aporte", hint: "Agregar efectivo", dir: "in" },
  buy_inventory: {
    label: "Compra",
    hint: "Efectivo → inventario",
    dir: "move",
  },
  sell_inventory: { label: "Venta", hint: "Inventario → efectivo", dir: "in" },
  lend: { label: "Préstamo", hint: "Cronograma", dir: "move" },
  repay: { label: "Cobro", hint: "Cobrar cuota", dir: "in" },
  expense: { label: "Gasto", hint: "Sale efectivo", dir: "out" },
};

export const DIR_BADGE: Record<Direction, string> = {
  in: "bg-emerald-400/15 text-emerald-400",
  out: "bg-red-400/15 text-red-400",
  move: "bg-secondary text-muted-foreground",
};

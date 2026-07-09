/** Shared Spanish presentation for movement types (labels/hints per design). */
import type { MovementType } from "@/backend/modules/movements/domain/movement";

export type Direction = "in" | "out" | "move";

export const MOVEMENT_META: Record<
  MovementType,
  {
    label: string;
    hint: string;
    dir: Direction;
    /** Per-type examples (prototype seed vocabulary) — one generic
     *  placeholder for every type was confusing. */
    amountPlaceholder: string;
    conceptPlaceholder: string;
  }
> = {
  contribute: {
    label: "Aporte",
    hint: "Agregar efectivo",
    dir: "in",
    amountPlaceholder: "500.00",
    conceptPlaceholder: "Ej. Aporte de julio",
  },
  buy_inventory: {
    label: "Compra",
    hint: "Efectivo → inventario",
    dir: "move",
    amountPlaceholder: "480.00",
    conceptPlaceholder: "Ej. 12 perfumes surtidos",
  },
  sell_inventory: {
    label: "Venta",
    hint: "Inventario → efectivo",
    dir: "in",
    amountPlaceholder: "210.00",
    conceptPlaceholder: "Ej. 3 perfumes · feria",
  },
  lend: {
    label: "Préstamo",
    hint: "Cronograma",
    dir: "move",
    amountPlaceholder: "300.00",
    conceptPlaceholder: "Ej. Préstamo a Karina",
  },
  repay: {
    label: "Cobro",
    hint: "Cobrar cuota",
    dir: "in",
    amountPlaceholder: "82.50",
    conceptPlaceholder: "Ej. Karina · cuota 1",
  },
  expense: {
    label: "Gasto",
    hint: "Sale efectivo",
    dir: "out",
    amountPlaceholder: "15.00",
    conceptPlaceholder: "Ej. Movilidad · delivery",
  },
};

export const DIR_BADGE: Record<Direction, string> = {
  in: "bg-emerald-400/15 text-emerald-400",
  out: "bg-red-400/15 text-red-400",
  move: "bg-secondary text-muted-foreground",
};

/**
 * What you may do to a movement, by type — the UI side of who owns what.
 *
 * "Movimiento" is how the ledger SHOWS these facts, not how they behave. A
 * cobro and a venta look alike in the feed and are nothing alike underneath:
 * undoing a cobro reopens a cuota, undoing a venta will one day restock. So
 * the rules live here as DATA, next to the reason, instead of as ifs scattered
 * through the dialog. The server enforces the same thing in propose-change.ts —
 * this table only decides which buttons light up.
 */
import type { MovementType } from "@/backend/modules/movements/domain/movement";

type Allowed = {
  edit: boolean;
  void: boolean;
  /** Shown under the buttons when something is not allowed. */
  note?: string;
};

export const ACTIONS_BY_TYPE: Record<MovementType, Allowed> = {
  contribute: { edit: true, void: true },
  expense: { edit: true, void: true },
  buy_inventory: { edit: true, void: true },
  sell_inventory: { edit: true, void: true },

  // lend/repay belong to a loan: the dialog derives to the loan page instead of
  // acting here (the warning + "Ir al préstamo" replace these buttons/notes).
  repay: { edit: false, void: false },
  lend: { edit: false, void: false },
};

/** What the movement is open to right now: the rules, plus its live state. */
export function allowedActions(
  type: MovementType,
  status: "active" | "voided",
  hasPendingChange: boolean,
) {
  const rules = ACTIONS_BY_TYPE[type];
  const open = status === "active" && !hasPendingChange;
  return {
    canEdit: open && rules.edit,
    canVoid: open && rules.void,
    note: rules.note,
  };
}

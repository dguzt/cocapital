import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { MovementType } from "./movement";

/** A movement about to enter the ledger, amounts in cents. */
export type NewMovement = {
  type: MovementType;
  amount: Cents;
  cost: Cents | null;
  concept: string | null;
  date: ISODate;
};

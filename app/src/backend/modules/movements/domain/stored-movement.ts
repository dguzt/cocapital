import type { ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { MovementStatus, MovementType } from "./movement";

/** A movement as the ledger keeps it. */
export type StoredMovement = {
  id: string;
  groupId: string;
  userId: string;
  type: MovementType;
  amount: Cents;
  cost: Cents | null;
  concept: string | null;
  date: ISODate;
  status: MovementStatus;
  createdAt: Date;
};

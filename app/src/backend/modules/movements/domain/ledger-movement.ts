import type { Cents } from "@/lib/money";
import type { MovementStatus, MovementType } from "./movement";

/** A movement as the feed shows it, with the partner who wrote it. */
export type LedgerMovement = {
  id: string;
  type: MovementType;
  amount: Cents;
  cost: Cents | null;
  concept: string | null;
  date: string;
  status: MovementStatus;
  createdAt: Date;
  authorId: string;
  authorName: string;
};

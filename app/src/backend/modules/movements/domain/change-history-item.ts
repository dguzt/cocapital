import type { PendingStatus } from "./pending";
import type { PendingChangeItem } from "./pending-change-item";

/** One change of a movement's history, with how it was decided. */
export type ChangeHistoryItem = PendingChangeItem & {
  status: PendingStatus;
  deciderName: string | null;
  decidedAt: Date | null;
};

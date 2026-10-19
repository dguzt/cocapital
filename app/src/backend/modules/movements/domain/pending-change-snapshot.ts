import type { ChangeKind } from "./change-kind";
import type { MovementSnapshot } from "./movement";
import type { PendingStatus } from "./pending-status";

/** Every field of a stored change that a decision needs. */
export type PendingChangeSnapshot = {
  id: string;
  status: PendingStatus;
  proposedBy: string;
  kind: ChangeKind;
  after: MovementSnapshot | null;
};

import type { ChangeKind } from "./change-kind";
import type { MovementSnapshot, MovementType } from "./movement";
import type { PendingStatus } from "./pending-status";

/** A change plus the type and group of the movement it targets. */
export type ChangeUnderDecision = {
  id: string;
  movementId: string;
  movementGroup: string;
  movementType: MovementType;
  status: PendingStatus;
  kind: ChangeKind;
  proposedBy: string;
  after: MovementSnapshot | null;
};

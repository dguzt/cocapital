import type { ChangeKind } from "./change-kind";
import type { MovementSnapshot } from "./movement";

/** A change waiting for a partner's OK, as the approvals inbox shows it. */
export type PendingChangeItem = {
  id: string;
  movementId: string;
  kind: ChangeKind;
  proposedBy: string;
  proposerName: string;
  before: MovementSnapshot;
  after: MovementSnapshot | null;
  createdAt: Date;
};

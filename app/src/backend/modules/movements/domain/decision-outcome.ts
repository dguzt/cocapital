import type { MovementSnapshot } from "./movement";

/** What a decision does: nothing more when rejected, the change when approved. */
export type DecisionOutcome =
  | { apply: false; pendingStatus: "rejected" }
  | {
      apply: true;
      pendingStatus: "approved";
      action:
        | { kind: "edit"; newSnapshot: MovementSnapshot }
        | { kind: "void" };
    };

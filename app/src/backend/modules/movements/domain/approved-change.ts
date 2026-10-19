import type { MovementSnapshot, MovementType } from "./movement";

/** What an approved change asks the movement's owner to do. */
export type ApprovedChange =
  | { kind: "void"; movementId: string; movementType: MovementType }
  | {
      kind: "edit";
      movementId: string;
      movementType: MovementType;
      after: MovementSnapshot;
    };

import type { NewMovement } from "./validate";

/** A movement about to be written to a group's ledger by a partner. */
export type MovementEntry = NewMovement & {
  groupId: string;
  userId: string;
};

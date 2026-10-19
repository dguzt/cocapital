import type { InviteCode } from "./invite-code";
import type { Member } from "./member";

/** Every field of a group that already exists. */
export type GroupSnapshot = {
  id: string;
  name: string;
  inviteCode: InviteCode;
  members: readonly Member[];
};

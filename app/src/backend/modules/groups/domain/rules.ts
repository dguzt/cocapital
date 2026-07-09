/**
 * M2 usecase rules (UC-102/103), pure. MVP: fixed 2-person group (D4).
 * The data layer executes what these decide.
 */
import { err, ok, type Result } from "@/lib/result";
import type { GroupError } from "./errors";

export const GROUP_SIZE = 2;

const INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
export const INVITE_CODE_LENGTH = 8;

/** 8 chars from an unambiguous alphabet, from caller-provided randomness. */
export function makeInviteCode(randomBytes: Uint8Array): string {
  return Array.from(
    randomBytes.slice(0, INVITE_CODE_LENGTH),
    (byte) => INVITE_ALPHABET[byte % INVITE_ALPHABET.length],
  ).join("");
}

export function validateGroupName(name: string): Result<string, GroupError> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 40) {
    return err({
      kind: "InvalidGroupName",
      message: "group name must be 1-40 characters",
    });
  }
  return ok(trimmed);
}

export type JoinDecision = { action: "join" } | { action: "already-member" };

/** UC-103: join via invite link; closes at 2/2 (D4). Idempotent for members. */
export function decideJoin(input: {
  group: { id: string } | null;
  code: string;
  memberCount: number;
  isMember: boolean;
  /** Is the joiner already in some OTHER group? (MVP: one group per user) */
  memberOfOtherGroup: boolean;
}): Result<JoinDecision, GroupError> {
  const { group, code, memberCount, isMember, memberOfOtherGroup } = input;
  if (!group) {
    return err({
      kind: "InviteNotFound",
      message: `no group for invite code ${code}`,
      code,
    });
  }
  if (isMember) return ok({ action: "already-member" });
  if (memberOfOtherGroup) {
    return err({
      kind: "AlreadyInGroup",
      message: "user already belongs to a group (MVP: one group per account)",
      groupId: group.id,
    });
  }
  if (memberCount >= GROUP_SIZE) {
    return err({
      kind: "GroupFull",
      message: "this group is already full (2/2)",
      groupId: group.id,
    });
  }
  return ok({ action: "join" });
}

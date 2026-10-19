import type { AppError } from "@/lib/result";

/** The expected ways a group command can fail. */
export type GroupError =
  | AppError<"InvalidGroupName">
  | AppError<"AlreadyInGroup", { groupId: string }>
  | AppError<"InviteNotFound", { code: string }>
  | AppError<"GroupFull", { groupId: string }>;

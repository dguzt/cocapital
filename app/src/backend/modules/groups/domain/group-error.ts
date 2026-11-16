import type { AppError } from "@/lib/result";

/** The expected ways a group command can fail. */
export type GroupError =
  | AppError<"InvalidGroupName">
  | AppError<"InviteNotFound", { code: string }>
  | AppError<"GroupFull", { groupId: string }>
  | AppError<"TooManyGroups", { userId: string }>;

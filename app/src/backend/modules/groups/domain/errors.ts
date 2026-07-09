import type { AppError } from "@/lib/result";

export type GroupError =
  | AppError<"InvalidGroupName">
  | AppError<"AlreadyInGroup", { groupId: string }>
  | AppError<"InviteNotFound", { code: string }>
  | AppError<"GroupFull", { groupId: string }>
  | AppError<"NoGroup">;

import type { AppError } from "@/lib/result";

export type PendingChangeError =
  | AppError<"MovementVoided", { movementId: string }>
  | AppError<"ChangeAlreadyPending", { movementId: string }>
  | AppError<"MissingChanges", { movementId: string }>
  | AppError<"AlreadyDecided", { pendingId: string; status: string }>
  | AppError<"SelfApproval", { pendingId: string; actorId: string }>;

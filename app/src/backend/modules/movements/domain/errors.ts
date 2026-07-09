import type { AppError } from "@/lib/result";

export type PendingChangeError =
  | AppError<"MovementNotFound", { movementId: string }>
  | AppError<"MovementVoided", { movementId: string }>
  | AppError<"SystemMovement", { movementId: string }>
  | AppError<"ChangeAlreadyPending", { movementId: string }>
  | AppError<"MissingChanges", { movementId: string }>
  | AppError<"ChangeNotFound", { pendingId: string }>
  | AppError<"AlreadyDecided", { pendingId: string; status: string }>
  | AppError<"SelfApproval", { pendingId: string; actorId: string }>;

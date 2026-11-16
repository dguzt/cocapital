import type { AppError } from "@/lib/result";

/** The expected ways picking or adding a contact can fail. */
export type ContactError =
  | AppError<"ContactNameRequired">
  | AppError<"ContactTooLong", { field: "name" | "phone" }>
  | AppError<"ContactNotFound", { contactId: string }>;

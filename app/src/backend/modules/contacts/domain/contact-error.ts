import type { AppError } from "@/lib/result";

/** The expected ways picking or adding a contact can fail. */
export type ContactError =
  | AppError<"ContactNameRequired">
  | AppError<"ContactNotFound", { contactId: string }>;

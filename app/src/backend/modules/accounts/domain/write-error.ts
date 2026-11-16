import type { AppError } from "@/lib/result";

/** The expected ways a partner's write can be turned away before it runs. */
export type WriteError = AppError<
  "RateLimited",
  { userId: string; windowSeconds: number }
>;

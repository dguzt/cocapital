import type { WriteError } from "@/backend/modules/accounts/domain/write-error";
import type { RateLimiter } from "@/backend/modules/accounts/ports/rate-limiter";
import { err, ok, type Result } from "@/lib/result";

export type ThrottleWritesInput = {
  userId: string;
};

/** Holds back a partner who writes faster than any person would. */
export class ThrottleWrites {
  static inject = ["rateLimiter"] as const;

  private static readonly WINDOWS = [
    { seconds: 60, limit: 60 },
    { seconds: 86_400, limit: 1_000 },
  ] as const;

  constructor(private readonly rateLimiter: RateLimiter) {}

  /**
   * Counts one write for the partner and checks it fits their quota.
   *
   * @param input - The partner about to write.
   * @returns Ok when the write may run, or `RateLimited` once the partner
   *   passed {@link ThrottleWrites.WINDOWS} in any window.
   */
  async execute(input: ThrottleWritesInput): Promise<Result<void, WriteError>> {
    const hits = await this.rateLimiter.hit({
      key: `writes:${input.userId}`,
      windowsInSeconds: ThrottleWrites.WINDOWS.map((window) => window.seconds),
    });

    const exceeded = ThrottleWrites.WINDOWS.find(
      (window) => (hits.get(window.seconds) ?? 0) > window.limit,
    );

    if (exceeded) {
      return err({
        kind: "RateLimited",
        message: `more than ${exceeded.limit} writes in ${exceeded.seconds} seconds`,
        userId: input.userId,
        windowSeconds: exceeded.seconds,
      });
    }

    return ok(undefined);
  }
}

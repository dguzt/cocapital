import type { AppError, Result } from "@/lib/result";

/** Runs several writes as one: they all land, or none of them does. */
export interface UnitOfWork {
  /**
   * Runs the work inside one transaction. A unit already running is joined,
   * not nested.
   *
   * @param work - The writes to run, ending in a result.
   * @returns The work's result. An `err` result rolls every write back; an
   *   `ok` result commits them.
   * @throws Whatever the work throws, after rolling every write back.
   */
  run<T, E extends AppError>(
    work: () => Promise<Result<T, E>>,
  ): Promise<Result<T, E>>;
}

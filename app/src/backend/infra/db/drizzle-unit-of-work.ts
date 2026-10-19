import type { UnitOfWork } from "@/backend/shared/ports/unit-of-work";
import type { AppError, Result } from "@/lib/result";
import type { Database } from "./client";
import { transactions } from "./transaction-context";

/** Carries an error result out of a transaction so it rolls back. */
class Rollback<E extends AppError> extends Error {
  constructor(readonly result: Result<never, E>) {
    super("unit of work rolled back");
  }
}

export class DrizzleUnitOfWork implements UnitOfWork {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async run<T, E extends AppError>(
    work: () => Promise<Result<T, E>>,
  ): Promise<Result<T, E>> {
    if (transactions.getStore()) {
      return work();
    }

    try {
      return await this.db.transaction((tx) =>
        transactions.run(tx, async () => {
          const result = await work();

          if (!result.ok) {
            throw new Rollback(result);
          }

          return result;
        }),
      );
    } catch (error) {
      if (error instanceof Rollback) {
        return error.result;
      }

      throw error;
    }
  }
}

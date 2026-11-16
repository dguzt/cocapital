import type { UnitOfWork } from "@/backend/shared/ports/unit-of-work";
import type { AppError, Result } from "@/lib/result";

/** Runs the work as it is, for use cases tested against in-memory repositories. */
export class ImmediateUnitOfWork implements UnitOfWork {
  run<T, E extends AppError>(
    work: () => Promise<Result<T, E>>,
  ): Promise<Result<T, E>> {
    return work();
  }
}

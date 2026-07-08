/**
 * A typed result: either a success `value` or a structured `error`.
 * Use instead of throwing for expected, domain-level failures — the error
 * becomes part of the function signature, so callers can't forget to handle it.
 *
 * ## 1. Define one error union per module (the `kind` is the discriminant)
 *
 *     // modules/loans/domain/errors.ts
 *     export type LoanError =
 *       | AppError<'LoanNotFound', { loanId: string }>
 *       | AppError<'InvalidSchedule', { reason: string }>;
 *
 * Each variant carries structured fields (loanId, reason, …) — never stuff
 * context into the message string; put it in the payload so callers can branch.
 *
 * ## 2. Return `ok(...)` / `err(...)` instead of returning a raw value or throwing
 *
 *     function getLoan(id: string): Result<Loan, LoanError> {
 *       const loan = repo.find(id);
 *       if (!loan) return err({ kind: 'LoanNotFound', message: `loan ${id} not found`, loanId: id });
 *       return ok(loan);
 *     }
 *
 * ## 3. Consume it — narrow on `.ok`, then switch on `.error.kind`
 *
 *     const result = getLoan(id);
 *     if (!result.ok) {
 *       switch (result.error.kind) {           // exhaustive: TS errors if a
 *         case 'LoanNotFound':                 // LoanError variant is unhandled
 *           return notFound(result.error.loanId);
 *         case 'InvalidSchedule':
 *           return badRequest(result.error.reason);
 *       }
 *     }
 *     render(result.value);                    // narrowed to the success type here
 *
 * Or, when both branches produce the same type, use `match` for an expression:
 *
 *     const label = match(result, {
 *       ok: (loan) => loan.borrowerName,
 *       err: (e) => `error: ${e.message}`,
 *     });
 */
export type AppError<
  Kind extends string = string,
  Extra extends Record<string, unknown> = {},
> = {
  readonly kind: Kind;
  readonly message: string;
  readonly cause?: unknown;
} & Extra;

export type Result<T, E extends AppError = AppError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E extends AppError>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

export function match<T, E extends AppError, R>(
  result: Result<T, E>,
  handlers: { ok: (value: T) => R; err: (error: E) => R },
): R {
  return result.ok ? handlers.ok(result.value) : handlers.err(result.error);
}

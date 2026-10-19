import { AsyncLocalStorage } from "node:async_hooks";

/** The transaction the current async call chain is running in, if any. */
export const transactions = new AsyncLocalStorage<object>();

/**
 * Wraps the database so every query goes to the transaction in progress, or
 * to the database itself when none is running.
 *
 * @param root - The database connection.
 * @returns A database that follows the current unit of work.
 */
export function transactionAware<T extends object>(root: T): T {
  return new Proxy(root, {
    get(target, property) {
      const executor = transactions.getStore() ?? target;

      const value = Reflect.get(executor, property, executor);

      if (typeof value === "function") {
        return value.bind(executor);
      }

      return value;
    },
  });
}

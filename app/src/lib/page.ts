/** A slice of a list read newest first: up to `limit` rows older than the row `after`. */
export type PageRequest = {
  limit: number;
  after?: string;
};

export const DEFAULT_PAGE_SIZE = 50;

export const MAX_PAGE_SIZE = 100;

/**
 * Reads the slice a caller asks for, never more than the largest page.
 *
 * @param input - The size asked for, if any, and the last row already read.
 * @returns The slice to read.
 */
export function pageOf(input: { limit?: number; after?: string }): PageRequest {
  const limit = Math.min(
    Math.max(1, Math.trunc(input.limit ?? DEFAULT_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );

  return { limit, after: input.after };
}

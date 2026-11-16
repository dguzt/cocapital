/** Counts how often something happens within windows of time. */
export interface RateLimiter {
  /**
   * Counts one more hit for a key in each of its current windows.
   *
   * @param input - The key and the length of every window, in seconds.
   * @returns The hits so far in each window, this one included, by window
   *   length.
   */
  hit(input: {
    key: string;
    windowsInSeconds: readonly number[];
  }): Promise<ReadonlyMap<number, number>>;
}

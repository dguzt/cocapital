/**
 * Picks the message registered under a key, ignoring inherited properties.
 *
 * @param messages - messages indexed by key
 * @param key - untrusted key, such as a query string value
 * @param fallback - message shown when the key is not registered
 * @returns the registered message, or the fallback
 */
export function messageFor(
  messages: Record<string, string>,
  key: string,
  fallback: string,
): string {
  return Object.hasOwn(messages, key) ? messages[key] : fallback;
}

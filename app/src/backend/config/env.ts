/**
 * Reads a required environment variable.
 *
 * @param name - The variable.
 * @returns Its value.
 * @throws When it is missing, naming where to set it.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local (dev) or the Vercel project settings (prod).`,
    );
  }
  return value;
}

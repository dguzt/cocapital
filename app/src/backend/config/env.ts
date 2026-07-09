/** Fail fast at boot: a missing env var must crash with a clear message,
 *  not surface later as a cryptic driver error. */
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

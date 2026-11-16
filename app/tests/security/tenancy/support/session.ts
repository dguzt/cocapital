/** The Clerk identity the mocked `auth()` reports for the current test. */
let signedIn: string | null = null;

/**
 * Signs the next server-action or page call in as a Clerk identity.
 *
 * @param clerkId - The identity, or null for an anonymous visitor.
 */
export function signInAs(clerkId: string | null): void {
  signedIn = clerkId;
}

/**
 * Stands in for Clerk's `auth()` in server code under test.
 *
 * @returns The session as Clerk would report it.
 */
export async function fakeAuth(): Promise<{ userId: string | null }> {
  return { userId: signedIn };
}

/** The digest Next puts on the error `notFound()` throws. */
export const NOT_FOUND = { digest: "NEXT_HTTP_ERROR_FALLBACK;404" };

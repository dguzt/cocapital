import { auth } from "@clerk/nextjs/server";

import { useCases } from "@/backend/application/container";
import type { User } from "@/backend/modules/accounts/domain/user";

/**
 * Reads the partner of the current session, signing them up on first visit.
 *
 * @returns The partner, or null when nobody is signed in.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { userId: authId } = await auth();

  if (!authId) {
    return null;
  }

  return useCases.ensureUser.execute({ authId });
}

/**
 * Reads the partner of the current session on a protected route.
 *
 * @returns The partner.
 * @throws When nobody is signed in, which the proxy should have prevented.
 */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("unauthenticated request past the proxy guard");
  }

  return user;
}

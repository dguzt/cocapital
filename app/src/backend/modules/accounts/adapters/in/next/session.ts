import { auth } from "@clerk/nextjs/server";

import { useCases } from "@/backend/application/container";
import type { User } from "@/backend/modules/accounts/domain/user";

/** The partner of the current session, registered on first sign-in. Null when signed out. */
export async function getCurrentUser(): Promise<User | null> {
  const { userId: authId } = await auth();

  if (!authId) {
    return null;
  }

  return useCases.ensureUser.execute({ authId });
}

/** The partner of the current session on protected routes; throws when signed out. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("unauthenticated request past the proxy guard");
  }

  return user;
}

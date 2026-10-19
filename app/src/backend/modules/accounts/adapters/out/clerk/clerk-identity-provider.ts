import { clerkClient } from "@clerk/nextjs/server";

import type { IdentityProfile } from "../../../domain/identity-profile";
import type { IdentityProvider } from "../../../ports/identity-provider";

export class ClerkIdentityProvider implements IdentityProvider {
  async profileOf(authId: string): Promise<IdentityProfile | null> {
    const client = await clerkClient();

    const user = await client.users
      .getUser(authId)
      .catch((error: { status?: number }) => {
        if (error.status === 404) {
          return null;
        }

        throw error;
      });

    if (!user) {
      return null;
    }

    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.emailAddresses[0]?.emailAddress ?? null,
    };
  }
}

import type { IdentityProfile } from "@/backend/modules/accounts/domain/identity-profile";

/** External source of a partner's profile (name and email). */
export interface IdentityProvider {
  /**
   * Reads the profile behind an identity.
   *
   * @param authId - The identity to look up.
   * @returns Its names and email, or null when the provider no longer knows it.
   */
  profileOf(authId: string): Promise<IdentityProfile | null>;
}

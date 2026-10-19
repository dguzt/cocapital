import type { IdentityProfile } from "../domain/identity-profile";

/** External source of a partner's profile (name and email). */
export interface IdentityProvider {
  /** The identity's profile, or null if the provider no longer knows it. */
  profileOf(authId: string): Promise<IdentityProfile | null>;
}

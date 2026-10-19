import type { IdentityProfile } from "./identity-profile";
import type { UserSnapshot } from "./user-snapshot";

/** A partner (socio) of CoCapital, bound to one identity of the auth provider. */
export class User {
  private constructor(
    readonly id: string,
    readonly authId: string,
    readonly name: string,
    readonly email: string,
  ) {}

  /**
   * Signs up a partner from their identity profile.
   *
   * @param authId - The identity the auth provider gave the partner.
   * @param profile - Names and email from the auth provider.
   * @returns A partner with a fresh id, named "First Last", else after the
   *   email's local part, else "Socio".
   */
  static register(authId: string, profile: IdentityProfile): User {
    return new User(
      crypto.randomUUID(),
      authId,
      User.displayNameFrom(profile),
      profile.email ?? "",
    );
  }

  /**
   * Rebuilds a partner who already signed up.
   *
   * @param snapshot - Every field of the partner, already valid.
   * @returns The same partner.
   */
  static restore(snapshot: UserSnapshot): User {
    return new User(
      snapshot.id,
      snapshot.authId,
      snapshot.name,
      snapshot.email,
    );
  }

  private static displayNameFrom(profile: IdentityProfile): string {
    const fullName = [profile.firstName, profile.lastName]
      .filter(Boolean)
      .join(" ");

    if (fullName) {
      return fullName;
    }

    return profile.email?.split("@")[0] || "Socio";
  }
}

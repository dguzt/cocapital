import type { IdentityProfile } from "./identity-profile";
import type { UserData } from "./user-data";

/** A partner (socio) of CoCapital, bound to one identity of the auth provider. */
export class User {
  private constructor(
    readonly id: string,
    readonly authId: string,
    readonly name: string,
    readonly email: string,
  ) {}

  /**
   * A new partner built from the identity profile.
   * Input: authId and profile. Output: a partner with a fresh id and a
   * display name — "First Last", else the email's local part, else "Socio".
   */
  static register(authId: string, profile: IdentityProfile): User {
    return new User(
      crypto.randomUUID(),
      authId,
      User.displayNameFrom(profile),
      profile.email ?? "",
    );
  }

  /** A partner already stored, as the repository reads it back. */
  static restore(data: UserData): User {
    return new User(data.id, data.authId, data.name, data.email);
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

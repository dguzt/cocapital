import { User } from "@/backend/modules/accounts/domain/user";
import type { IdentityProvider } from "@/backend/modules/accounts/ports/identity-provider";
import type { UserRepository } from "@/backend/modules/accounts/ports/user-repository";

export type EnsureUserInput = {
  authId: string;
};

/** Makes sure every signed-in identity has its partner. */
export class EnsureUser {
  static inject = ["users", "identity"] as const;

  constructor(
    private readonly users: UserRepository,
    private readonly identity: IdentityProvider,
  ) {}

  /**
   * Finds the partner behind an identity, signing them up the first time.
   *
   * @param input - The identity of the current session.
   * @returns The partner, or null when the auth provider no longer knows
   *   that identity.
   */
  async execute(input: EnsureUserInput): Promise<User | null> {
    const existing = await this.users.findByAuthId(input.authId);

    if (existing) {
      return existing;
    }

    return this.register(input.authId);
  }

  private async register(authId: string): Promise<User | null> {
    const profile = await this.identity.profileOf(authId);

    if (!profile) {
      return null;
    }

    const user = User.register(authId, profile);

    const inserted = await this.users.insertIfAbsent(user);

    if (inserted) {
      return user;
    }

    return this.users.findByAuthId(authId);
  }
}

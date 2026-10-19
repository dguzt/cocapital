import { User } from "../domain/user";
import type { IdentityProvider } from "../ports/identity-provider";
import type { UserRepository } from "../ports/user-repository";

export type EnsureUserInput = {
  authId: string;
};

/**
 * Returns the partner behind an authenticated identity, registering them the
 * first time they sign in. Input: the session's authId. Output: the partner,
 * or null if the identity provider no longer knows that authId.
 */
export class EnsureUser {
  static inject = ["users", "identity"] as const;

  constructor(
    private readonly users: UserRepository,
    private readonly identity: IdentityProvider,
  ) {}

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

import type { User } from "@/backend/modules/accounts/domain/user";

/** Storage of partners. */
export interface UserRepository {
  /**
   * Finds a partner by their auth identity.
   *
   * @param authId - The identity the auth provider gave the partner.
   * @returns The partner, or null when they never signed in.
   */
  findByAuthId(authId: string): Promise<User | null>;

  /**
   * Stores a partner unless their auth identity is already stored.
   *
   * @param user - A partner just signed up with `User.register`.
   * @returns True when stored, false when another request stored them first.
   */
  insertIfAbsent(user: User): Promise<boolean>;
}

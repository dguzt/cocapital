import type { User } from "@/backend/modules/accounts/domain/user";

/** Storage of partners. */
export interface UserRepository {
  /** The partner with that auth identity, or null if they never signed in. */
  findByAuthId(authId: string): Promise<User | null>;

  /**
   * Stores the partner unless their authId already exists.
   * Output: true if stored, false if another request stored it first.
   */
  insertIfAbsent(user: User): Promise<boolean>;
}

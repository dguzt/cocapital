import { User } from "@/backend/modules/accounts/domain/user";
import type { Users } from "./users.table";

/** Translates between the users table and the User entity. */
export class UserMapper {
  /**
   * Builds the entity from the row that stores it.
   *
   * @param row - The row of the users table.
   * @returns The partner as the domain knows them.
   */
  static toDomain(row: typeof Users.$inferSelect): User {
    return User.restore({
      id: row.id,
      authId: row.clerkId,
      name: row.name,
      email: row.email,
    });
  }

  /**
   * Builds the row that stores a partner.
   *
   * @param user - The entity to store.
   * @returns The values for an insert into the users table.
   */
  static toRow(user: User): typeof Users.$inferInsert {
    return {
      id: user.id,
      clerkId: user.authId,
      name: user.name,
      email: user.email,
    };
  }
}

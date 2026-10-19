import { eq } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import { User } from "@/backend/modules/accounts/domain/user";
import type { UserRepository } from "@/backend/modules/accounts/ports/user-repository";
import { Users } from "./users.table";

export class DrizzleUserRepository implements UserRepository {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async findByAuthId(authId: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(Users)
      .where(eq(Users.clerkId, authId))
      .limit(1);

    if (!row) {
      return null;
    }

    return User.restore({
      id: row.id,
      authId: row.clerkId,
      name: row.name,
      email: row.email,
    });
  }

  async insertIfAbsent(user: User): Promise<boolean> {
    const inserted = await this.db
      .insert(Users)
      .values({
        id: user.id,
        clerkId: user.authId,
        name: user.name,
        email: user.email,
      })
      .onConflictDoNothing()
      .returning({ id: Users.id });

    return inserted.length > 0;
  }
}

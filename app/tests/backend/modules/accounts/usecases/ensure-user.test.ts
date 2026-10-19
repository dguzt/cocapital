import { describe, expect, it } from "vitest";

import type { IdentityProfile } from "@/backend/modules/accounts/domain/identity-profile";
import { User } from "@/backend/modules/accounts/domain/user";
import type { IdentityProvider } from "@/backend/modules/accounts/ports/identity-provider";
import type { UserRepository } from "@/backend/modules/accounts/ports/user-repository";
import { EnsureUser } from "@/backend/modules/accounts/usecases/ensure-user";

class InMemoryUsers implements UserRepository {
  readonly stored = new Map<string, User>();

  async findByAuthId(authId: string) {
    return this.stored.get(authId) ?? null;
  }

  async insertIfAbsent(user: User) {
    if (this.stored.has(user.authId)) {
      return false;
    }

    this.stored.set(user.authId, user);

    return true;
  }
}

class FakeIdentity implements IdentityProvider {
  calls = 0;

  constructor(private readonly profile: IdentityProfile | null) {}

  async profileOf() {
    this.calls += 1;

    return this.profile;
  }
}

/** Misses the first read, loses the insert, then sees the winner's row. */
class LosingRaceUsers implements UserRepository {
  private reads = 0;

  constructor(private readonly winner: User) {}

  async findByAuthId() {
    this.reads += 1;

    return this.reads === 1 ? null : this.winner;
  }

  async insertIfAbsent() {
    return false;
  }
}

const ROSA: IdentityProfile = {
  firstName: "Rosa",
  lastName: null,
  email: "rosa@t.pe",
};

describe("EnsureUser", () => {
  it("returns a known partner without asking the identity provider", async () => {
    const users = new InMemoryUsers();
    const identity = new FakeIdentity(ROSA);
    const known = User.register("auth_rosa", ROSA);

    await users.insertIfAbsent(known);

    const user = await new EnsureUser(users, identity).execute({
      authId: "auth_rosa",
    });

    expect(user).toBe(known);
    expect(identity.calls).toBe(0);
  });

  it("registers a partner on first sign-in", async () => {
    const users = new InMemoryUsers();

    const user = await new EnsureUser(users, new FakeIdentity(ROSA)).execute({
      authId: "auth_rosa",
    });

    expect(user?.name).toBe("Rosa");
    expect(users.stored.get("auth_rosa")).toBe(user);
  });

  it("returns the stored partner when another request registered them first", async () => {
    const winner = User.register("auth_rosa", ROSA);
    const users = new LosingRaceUsers(winner);

    const user = await new EnsureUser(users, new FakeIdentity(ROSA)).execute({
      authId: "auth_rosa",
    });

    expect(user).toBe(winner);
  });

  it("returns null when the identity provider no longer knows the authId", async () => {
    const users = new InMemoryUsers();

    const user = await new EnsureUser(users, new FakeIdentity(null)).execute({
      authId: "auth_gone",
    });

    expect(user).toBeNull();
    expect(users.stored.size).toBe(0);
  });
});

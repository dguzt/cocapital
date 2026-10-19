import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/backend/infra/db/client";
import { DrizzleUserRepository } from "@/backend/modules/accounts/adapters/out/drizzle/drizzle-user-repository";
import { User } from "@/backend/modules/accounts/domain/user";
import { truncateAll } from "@/test/truncate";

const repository = new DrizzleUserRepository(db);

const ROSA = {
  firstName: "Rosa",
  lastName: "Quispe",
  email: "rosa@t.pe",
};

beforeEach(truncateAll);

describe("DrizzleUserRepository", () => {
  it("stores a partner once and reads it back by authId", async () => {
    const rosa = User.register("auth_rosa", ROSA);

    expect(await repository.insertIfAbsent(rosa)).toBe(true);

    const found = await repository.findByAuthId("auth_rosa");

    expect(found).toEqual(rosa);
  });

  it("refuses a second partner with the same authId", async () => {
    await repository.insertIfAbsent(User.register("auth_rosa", ROSA));

    const duplicate = User.register("auth_rosa", ROSA);

    expect(await repository.insertIfAbsent(duplicate)).toBe(false);
  });

  it("returns null for an authId that never signed in", async () => {
    expect(await repository.findByAuthId("auth_nobody")).toBeNull();
  });
});

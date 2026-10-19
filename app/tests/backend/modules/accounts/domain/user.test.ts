import { describe, expect, it } from "vitest";

import { User } from "@/backend/modules/accounts/domain/user";

const profile = (overrides: Partial<Parameters<typeof User.register>[1]>) => ({
  firstName: null,
  lastName: null,
  email: null,
  ...overrides,
});

describe("User.register", () => {
  it("names the partner with first and last name", () => {
    const user = User.register(
      "auth_1",
      profile({ firstName: "Rosa", lastName: "Quispe", email: "rosa@t.pe" }),
    );

    expect(user.name).toBe("Rosa Quispe");
    expect(user.email).toBe("rosa@t.pe");
    expect(user.authId).toBe("auth_1");
  });

  it("uses the first name alone when there is no last name", () => {
    const user = User.register("auth_1", profile({ firstName: "Rosa" }));

    expect(user.name).toBe("Rosa");
  });

  it("falls back to the email's local part", () => {
    const user = User.register("auth_1", profile({ email: "diego.r@t.pe" }));

    expect(user.name).toBe("diego.r");
  });

  it("falls back to Socio with an empty email when the profile is empty", () => {
    const user = User.register("auth_1", profile({}));

    expect(user.name).toBe("Socio");
    expect(user.email).toBe("");
  });

  it("gives every new partner a different id", () => {
    const first = User.register("auth_1", profile({}));
    const second = User.register("auth_2", profile({}));

    expect(first.id).not.toBe(second.id);
  });
});

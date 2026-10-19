import { describe, expect, it } from "vitest";

import { Group } from "@/backend/modules/groups/domain/group";

const DIEGO = { userId: "u-diego", name: "Diego" };

const ROSA = { userId: "u-rosa", name: "Rosa" };

function founded(): Group {
  const result = Group.create("Inversiones DR", DIEGO);

  if (!result.ok) {
    throw new Error("seed failed");
  }

  return result.value;
}

describe("Group.create", () => {
  it("trims the name and seats the creator", () => {
    const result = Group.create("  Inversiones DR  ", DIEGO);

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.value.name).toBe("Inversiones DR");
    expect(result.value.members).toEqual([{ ...DIEGO, role: "creator" }]);
    expect(result.value.inviteCode.value).toHaveLength(8);
  });

  it.each(["", "   ", "x".repeat(41)])("rejects the name %j", (name) => {
    const result = Group.create(name, DIEGO);

    expect(!result.ok && result.error.kind).toBe("InvalidGroupName");
  });
});

describe("Group.admit", () => {
  it("seats a second partner as a member and leaves the original untouched", () => {
    const group = founded();

    const result = group.admit(ROSA);

    expect(result.ok && result.value.members).toEqual([
      { ...DIEGO, role: "creator" },
      { ...ROSA, role: "member" },
    ]);
    expect(group.members).toHaveLength(1);
  });

  it("refuses a partner once every seat is taken", () => {
    const full = founded().admit(ROSA);

    if (!full.ok) {
      throw new Error("seed failed");
    }

    const result = full.value.admit({ userId: "u-x", name: "X" });

    expect(!result.ok && result.error.kind).toBe("GroupFull");
  });
});

describe("Group.hasFreeSeat", () => {
  it("is true until the group reaches its capacity", () => {
    const group = founded();

    expect(group.hasFreeSeat()).toBe(true);

    const full = group.admit(ROSA);

    expect(full.ok && full.value.hasFreeSeat()).toBe(false);
  });
});

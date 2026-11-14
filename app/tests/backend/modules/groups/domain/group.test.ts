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

function withMembers(count: number): Group {
  return Array.from({ length: count - 1 }, (_, i) => ({
    userId: `u-${i}`,
    name: `Socio ${i}`,
  })).reduce((group, partner) => {
    const admitted = group.admit(partner);

    if (!admitted.ok) {
      throw new Error("seed failed");
    }

    return admitted.value;
  }, founded());
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

  it("seats up to ten partners and refuses the eleventh", () => {
    const full = withMembers(10);

    expect(full.members).toHaveLength(10);

    const result = full.admit({ userId: "u-x", name: "X" });

    expect(!result.ok && result.error.kind).toBe("GroupFull");
  });
});

describe("Group.hasFreeSeat", () => {
  it("is true until the group reaches its capacity", () => {
    expect(withMembers(9).hasFreeSeat()).toBe(true);
    expect(withMembers(10).hasFreeSeat()).toBe(false);
  });
});

describe("Group.isAlone", () => {
  it("is true only while the creator is the single member", () => {
    expect(founded().isAlone()).toBe(true);
    expect(withMembers(2).isAlone()).toBe(false);
  });
});

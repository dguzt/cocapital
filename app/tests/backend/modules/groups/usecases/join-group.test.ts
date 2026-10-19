import { InMemoryGroups } from "@tests/backend/modules/groups/support/in-memory-groups";
import { beforeEach, describe, expect, it } from "vitest";
import { Group } from "@/backend/modules/groups/domain/group";
import { JoinGroup } from "@/backend/modules/groups/usecases/join-group";

const DIEGO = { userId: "u-diego", name: "Diego" };

const ROSA = { userId: "u-rosa", name: "Rosa" };

let groups: InMemoryGroups;

let group: Group;

let joinGroup: JoinGroup;

beforeEach(() => {
  const created = Group.create("Inversiones DR", DIEGO);

  if (!created.ok) {
    throw new Error("seed failed");
  }

  group = created.value;

  groups = new InMemoryGroups();

  groups.stored.push(group);

  joinGroup = new JoinGroup(groups);
});

describe("JoinGroup", () => {
  it("seats the partner as a member, even with a code typed in lower case", async () => {
    const result = await joinGroup.execute({
      partner: ROSA,
      code: group.inviteCode.value.toLowerCase(),
    });

    expect(result.ok && result.value.members).toHaveLength(2);
    expect(groups.addedSeats).toEqual([
      { groupId: group.id, member: { ...ROSA, role: "member" } },
    ]);
  });

  it("answers InviteNotFound for an unknown code", async () => {
    const result = await joinGroup.execute({ partner: ROSA, code: "ZZZZZZZZ" });

    expect(!result.ok && result.error.kind).toBe("InviteNotFound");
  });

  it("lets a member open the link again without adding a seat", async () => {
    const result = await joinGroup.execute({
      partner: DIEGO,
      code: group.inviteCode.value,
    });

    expect(result.ok).toBe(true);
    expect(groups.addedSeats).toHaveLength(0);
  });

  it("refuses a partner who already belongs to another group", async () => {
    const other = Group.create("Otro", ROSA);

    if (!other.ok) {
      throw new Error("seed failed");
    }

    groups.stored.push(other.value);

    const result = await joinGroup.execute({
      partner: ROSA,
      code: group.inviteCode.value,
    });

    expect(!result.ok && result.error.kind).toBe("AlreadyInGroup");
    expect(groups.addedSeats).toHaveLength(0);
  });

  it("refuses a partner when the group is full", async () => {
    const full = group.admit(ROSA);

    if (!full.ok) {
      throw new Error("seed failed");
    }

    groups.stored[0] = full.value;

    const result = await joinGroup.execute({
      partner: { userId: "u-x", name: "X" },
      code: group.inviteCode.value,
    });

    expect(!result.ok && result.error.kind).toBe("GroupFull");
    expect(groups.addedSeats).toHaveLength(0);
  });
});

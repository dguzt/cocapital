import { InMemoryGroups } from "@tests/backend/modules/groups/support/in-memory-groups";
import { describe, expect, it } from "vitest";
import { Group } from "@/backend/modules/groups/domain/group";
import { GetGroupOf } from "@/backend/modules/groups/usecases/get-group-of";

const DIEGO = { userId: "u-diego", name: "Diego" };

function storedGroup(): { groups: InMemoryGroups; group: Group } {
  const created = Group.create("Inversiones DR", DIEGO);

  if (!created.ok) {
    throw new Error("seed failed");
  }

  const groups = new InMemoryGroups();

  groups.stored.push(created.value);

  return { groups, group: created.value };
}

describe("GetGroupOf", () => {
  it("opens the group for one of its members", async () => {
    const { groups, group } = storedGroup();

    const found = await new GetGroupOf(groups).execute({
      userId: DIEGO.userId,
      groupId: group.id,
    });

    expect(found?.id).toBe(group.id);
  });

  it("hides the group from someone who is not a member", async () => {
    const { groups, group } = storedGroup();

    const found = await new GetGroupOf(groups).execute({
      userId: "u-stranger",
      groupId: group.id,
    });

    expect(found).toBeNull();
  });

  it("answers null for a group that does not exist", async () => {
    const { groups } = storedGroup();

    const found = await new GetGroupOf(groups).execute({
      userId: DIEGO.userId,
      groupId: "missing",
    });

    expect(found).toBeNull();
  });
});

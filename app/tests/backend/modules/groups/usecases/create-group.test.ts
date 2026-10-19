import { InMemoryGroups } from "@tests/backend/modules/groups/support/in-memory-groups";
import { describe, expect, it } from "vitest";
import { CreateGroup } from "@/backend/modules/groups/usecases/create-group";

const DIEGO = { userId: "u-diego", name: "Diego" };

describe("CreateGroup", () => {
  it("stores a new group with the partner as creator", async () => {
    const groups = new InMemoryGroups();

    const result = await new CreateGroup(groups).execute({
      creator: DIEGO,
      name: "Inversiones DR",
    });

    expect(result.ok).toBe(true);
    expect(groups.stored).toHaveLength(1);
    expect(groups.stored[0].members[0]).toEqual({ ...DIEGO, role: "creator" });
  });

  it("refuses a partner who already has a group", async () => {
    const groups = new InMemoryGroups();

    const useCase = new CreateGroup(groups);

    await useCase.execute({ creator: DIEGO, name: "Inversiones DR" });

    const second = await useCase.execute({ creator: DIEGO, name: "Otro" });

    expect(!second.ok && second.error.kind).toBe("AlreadyInGroup");
    expect(groups.stored).toHaveLength(1);
  });

  it("stores nothing when the name is invalid", async () => {
    const groups = new InMemoryGroups();

    const result = await new CreateGroup(groups).execute({
      creator: DIEGO,
      name: "   ",
    });

    expect(!result.ok && result.error.kind).toBe("InvalidGroupName");
    expect(groups.stored).toHaveLength(0);
  });
});

import { seedGroup, seedUser } from "@tests/security/ledger/seed";
import { createGroup, joinGroup } from "@tests/support/use-cases";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Memberships } from "@/backend/infra/db/schema";
import { Group } from "@/backend/modules/groups/domain/group";
import { truncateAll } from "@/test/truncate";

beforeEach(truncateAll);

describe("group writes", () => {
  it("joins racing for the last seat never exceed the capacity", async () => {
    const founder = await seedUser("Founder");

    const others = await Promise.all(
      Array.from({ length: Group.CAPACITY - 2 }, (_, index) =>
        seedUser(`Socio${index}`),
      ),
    );

    const group = await seedGroup(founder, ...others);

    const racers = await Promise.all([
      seedUser("RacerA"),
      seedUser("RacerB"),
      seedUser("RacerC"),
    ]);

    await Promise.allSettled(
      racers.map((racer) => joinGroup(racer, group.inviteCode.value)),
    );

    const seats = await db
      .select()
      .from(Memberships)
      .where(eq(Memberships.groupId, group.id));

    expect(seats.length).toBeLessThanOrEqual(Group.CAPACITY);
  });

  it("refuses a group name longer than 40 characters", async () => {
    const founder = await seedUser("Founder");

    const created = await createGroup(founder, "x".repeat(41));

    expect(!created.ok && created.error.kind).toBe("InvalidGroupName");
  });
});

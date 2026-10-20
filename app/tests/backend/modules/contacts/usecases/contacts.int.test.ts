/** Integration: the people a group lends or sells to. */

import {
  createGroup,
  createLoan,
  listContacts,
  listMovements,
} from "@tests/support/use-cases";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Users } from "@/backend/infra/db/schema";
import { Schedule } from "@/backend/modules/loans/domain/schedule";
import { truncateAll } from "@/test/truncate";

const TODAY = "2026-07-09";

async function groupOf(clerkId: string, name: string) {
  const [user] = await db
    .insert(Users)
    .values({ clerkId, name, email: `${clerkId}@test.pe` })
    .returning();

  const created = await createGroup(user, `Grupo ${name}`);

  if (!created.ok) {
    throw new Error("seed failed");
  }

  return { user, group: created.value };
}

function loanTo(borrower: { id: string } | { name: string }) {
  const schedule = Schedule.generate({
    capital: 10000,
    ratePercent: 10,
    installmentCount: 2,
    frequency: "monthly",
    startDate: TODAY,
  });

  if (!schedule.ok) {
    throw new Error("engine failed");
  }

  return {
    borrower,
    capital: 10000,
    rateBps: 1000,
    frequency: "monthly" as const,
    startDate: TODAY,
    installments: schedule.value.installments,
  };
}

beforeEach(truncateAll);

describe("contacts", () => {
  it("a contact of another group cannot be used", async () => {
    const ana = await groupOf("clerk_ana", "Ana");

    const rosa = await groupOf("clerk_rosa", "Rosa");

    await createLoan(ana.group.id, ana.user.id, loanTo({ name: "Karina" }));

    const [karina] = await listContacts(ana.group.id);

    const result = await createLoan(
      rosa.group.id,
      rosa.user.id,
      loanTo({ id: karina.id }),
    );

    expect(!result.ok && result.error.kind).toBe("ContactNotFound");
    expect(await listMovements(rosa.group.id)).toHaveLength(0);
  });

  it("a blank new name writes nothing", async () => {
    const ana = await groupOf("clerk_ana", "Ana");

    const result = await createLoan(
      ana.group.id,
      ana.user.id,
      loanTo({ name: "   " }),
    );

    expect(!result.ok && result.error.kind).toBe("ContactNameRequired");
    expect(await listContacts(ana.group.id)).toHaveLength(0);
    expect(await listMovements(ana.group.id)).toHaveLength(0);
  });
});

import {
  addMovement,
  createGroup,
  createLoan,
  joinGroup,
} from "@tests/support/use-cases";
import { eq } from "drizzle-orm";
import { db } from "@/backend/infra/db/client";
import { Movements, Users } from "@/backend/infra/db/schema";
import { Schedule } from "@/backend/modules/loans/domain/schedule";
import { ManualMovement } from "@/backend/modules/movements/domain/manual-movement";

export const TODAY = "2026-11-15";

export type Seeded = { id: string; name: string };

export async function seedUser(name: string): Promise<Seeded> {
  const [user] = await db
    .insert(Users)
    .values({
      clerkId: `clerk_${name.toLowerCase()}`,
      name,
      email: `${name.toLowerCase()}@test.pe`,
    })
    .returning();

  return user;
}

export async function seedGroup(creator: Seeded, ...others: Seeded[]) {
  const created = await createGroup(creator, `Grupo de ${creator.name}`);

  if (!created.ok) {
    throw new Error("seed group failed");
  }

  for (const other of others) {
    await joinGroup(other, created.value.inviteCode.value);
  }

  return created.value;
}

export async function seedMovement(
  groupId: string,
  userId: string,
  type: string,
  amountSoles: string,
) {
  const parsed = ManualMovement.parse({ type, amountSoles, today: TODAY });

  if (!parsed.ok) {
    throw new Error("seed movement failed");
  }

  return addMovement(groupId, userId, parsed.value);
}

export async function seedLoan(groupId: string, userId: string) {
  const schedule = Schedule.generate({
    capital: 30000,
    ratePercent: 10,
    installmentCount: 3,
    frequency: "monthly",
    startDate: TODAY,
  });

  if (!schedule.ok) {
    throw new Error("seed schedule failed");
  }

  const created = await createLoan(groupId, userId, {
    borrower: { name: "Karina" },
    capital: schedule.value.capital,
    rateBps: 1000,
    frequency: "monthly",
    startDate: TODAY,
    installments: schedule.value.installments,
  });

  if (!created.ok) {
    throw new Error("seed loan failed");
  }

  return created.value.loanId;
}

export async function movementRow(movementId: string) {
  const [row] = await db
    .select()
    .from(Movements)
    .where(eq(Movements.id, movementId));

  return row;
}

import { addMovement, createGroup } from "@tests/support/use-cases";
import { db } from "@/backend/infra/db/client";
import { Users } from "@/backend/infra/db/schema";
import { ManualMovement } from "@/backend/modules/movements/domain/manual-movement";

export const TODAY = "2026-10-18";

export async function seedGroup(cash = "100000") {
  const [owner] = await db
    .insert(Users)
    .values({ clerkId: "clerk_owner", name: "Owner", email: "o@test.pe" })
    .returning();

  const created = await createGroup(owner, "Resources audit");

  if (!created.ok) {
    throw new Error("seed failed");
  }

  const contribute = ManualMovement.parse({
    type: "contribute",
    amountSoles: cash,
    today: TODAY,
  });

  if (!contribute.ok) {
    throw new Error("seed failed");
  }

  await addMovement(created.value.id, owner.id, contribute.value);

  return { owner, group: created.value };
}

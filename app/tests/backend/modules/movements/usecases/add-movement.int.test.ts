/** E2 integration: record Movements → ledger → capital derivation. */
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Users } from "@/backend/infra/db/schema";
import { deriveCapital } from "@/backend/modules/capital/domain/derive";
import { createGroup } from "@/backend/modules/groups/data";
import { validateNewMovement } from "@/backend/modules/movements/domain/validate";
import { addMovement } from "@/backend/modules/movements/usecases/add-movement";
import { listMovements } from "@/backend/modules/movements/usecases/list-movements";
import { truncateAll } from "@/test/truncate";

async function seed() {
  const [diego] = await db
    .insert(Users)
    .values({ clerkId: "clerk_diego", name: "Diego", email: "d@test.pe" })
    .returning();
  const created = await createGroup(diego.id, "Inversiones DR");
  if (!created.ok) throw new Error("seed failed");
  return { diego, group: created.value };
}

function valid(input: Parameters<typeof validateNewMovement>[0]) {
  const r = validateNewMovement(input);
  if (!r.ok) throw new Error(`invalid test input: ${r.error.kind}`);
  return r.value;
}

beforeEach(truncateAll);

describe("E2: record → ledger → capital", () => {
  it("appends Movements and derives the dashboard numbers", async () => {
    const { diego, group } = await seed();
    const today = "2026-07-09";

    await addMovement(
      group.id,
      diego.id,
      valid({ type: "contribute", amountSoles: "500", today }),
    );
    await addMovement(
      group.id,
      diego.id,
      valid({ type: "buy_inventory", amountSoles: "300", today }),
    );
    await addMovement(
      group.id,
      diego.id,
      valid({
        type: "sell_inventory",
        amountSoles: "120",
        costSoles: "90",
        concept: "3 perfumes · feria",
        today,
      }),
    );

    const ledger = await listMovements(group.id);
    expect(ledger).toHaveLength(3);
    expect(ledger[0].concept).toBe("3 perfumes · feria"); // newest first
    expect(ledger[0].authorName).toBe("Diego");

    const capital = deriveCapital(ledger, []);
    expect(capital.cash).toBe(32000); // 500 − 300 + 120
    expect(capital.inventory).toBe(21000); // 300 − 90 cost
    expect(capital.salesProfit).toBe(3000);
    expect(capital.total).toBe(53000); // 500 + 30 margin
  });

  it("scopes the ledger by group", async () => {
    const { diego, group } = await seed();
    const [rosa] = await db
      .insert(Users)
      .values({ clerkId: "clerk_rosa", name: "Rosa", email: "r@test.pe" })
      .returning();
    const other = await createGroup(rosa.id, "Otro");
    if (!other.ok) throw new Error("seed failed");

    await addMovement(
      group.id,
      diego.id,
      valid({ type: "contribute", amountSoles: "100", today: "2026-07-09" }),
    );
    expect(await listMovements(other.value.id)).toHaveLength(0);
    expect(await listMovements(group.id)).toHaveLength(1);
  });
});

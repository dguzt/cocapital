import { seedGroup, TODAY } from "@tests/security/resources/seed";
import { createCreditSale, listMovements } from "@tests/support/use-cases";
import { beforeEach, describe, expect, it } from "vitest";
import {
  type ActivityCursor,
  type ActivityPage,
  readActivityPage,
} from "@/backend/application/activity-page";
import { db } from "@/backend/infra/db/client";
import { CreditSalePlanChanges, Movements } from "@/backend/infra/db/schema";
import { truncateAll } from "@/test/truncate";

beforeEach(truncateAll, 120_000);

const BASE = Date.parse("2026-10-18T12:00:00Z");

async function readEveryPage(groupId: string) {
  const pages: ActivityPage[] = [];

  const walk = async (cursor: ActivityCursor): Promise<void> => {
    const page = await readActivityPage(groupId, cursor);

    pages.push(page);

    if (page.next) {
      await walk(page.next);
    }
  };

  await walk({});

  return pages;
}

describe("the ledger, one page at a time", () => {
  it("walks movements written in the same instant without repeating or skipping one", async () => {
    const { owner, group } = await seedGroup();

    await db.insert(Movements).values(
      Array.from({ length: 120 }, (_, i) => ({
        groupId: group.id,
        userId: owner.id,
        type: "expense" as const,
        amount: 100 + i,
        date: TODAY,
      })),
    );

    const first = await listMovements(group.id);

    const second = await listMovements(group.id, first.at(-1)?.id);

    const third = await listMovements(group.id, second.at(-1)?.id);

    const ids = [...first, ...second, ...third].map((movement) => movement.id);

    expect([first.length, second.length, third.length]).toEqual([50, 50, 21]);
    expect(new Set(ids).size).toBe(121);
  }, 60_000);

  it("merges movements and plan rewrites newest first across pages", async () => {
    const { owner, group } = await seedGroup();

    const sale = await createCreditSale(group.id, owner.id, {
      buyer: { name: "B" },
      item: "I",
      price: 1000,
      cost: null,
      downPayment: 0,
      frequency: "monthly",
      startDate: TODAY,
      installments: [{ dueDate: "2027-01-10", amount: 1000 }],
    });

    if (!sale.ok) {
      throw new Error("seed failed");
    }

    await db.insert(Movements).values(
      Array.from({ length: 60 }, (_, i) => ({
        groupId: group.id,
        userId: owner.id,
        type: "expense" as const,
        amount: 100,
        date: TODAY,
        createdAt: new Date(BASE + i * 2000),
      })),
    );

    await db.insert(CreditSalePlanChanges).values(
      Array.from({ length: 40 }, (_, i) => ({
        saleId: sale.value.saleId,
        userId: owner.id,
        fromCount: 1,
        toCount: 1,
        createdAt: new Date(BASE + i * 2000 + 1000),
      })),
    );

    const pages = await readEveryPage(group.id);

    const entries = pages.flatMap((page) =>
      [...page.movements, ...page.planChanges]
        .map((entry) => ({ id: entry.id, at: entry.createdAt.getTime() }))
        .sort((a, b) => b.at - a.at),
    );

    const times = entries.map((entry) => entry.at);

    expect(
      pages.map((page) => page.movements.length + page.planChanges.length),
    ).toEqual([50, 50, 2]);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(102);
    expect(times).toEqual([...times].sort((a, b) => b - a));
  }, 60_000);
});

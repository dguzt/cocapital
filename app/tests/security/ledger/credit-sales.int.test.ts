import {
  seedGroup,
  seedMovement,
  seedUser,
  TODAY,
} from "@tests/security/ledger/seed";
import {
  collectSaleInstallment,
  createCreditSale,
  decideMovementChange,
  getCreditSale,
  listMovements,
  proposeVoidCreditSale,
  replanCreditSale,
} from "@tests/support/use-cases";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Contacts, Movements } from "@/backend/infra/db/schema";
import type { NewCreditSale } from "@/backend/modules/inventory/domain/new-credit-sale";
import { truncateAll } from "@/test/truncate";

beforeEach(truncateAll);

const LICUADORA: NewCreditSale = {
  buyer: { name: "Juan" },
  item: "Licuadora",
  price: 10000,
  cost: 6000,
  downPayment: 2000,
  frequency: "monthly",
  startDate: TODAY,
  installments: [
    { dueDate: "2026-12-15", amount: 2000 },
    { dueDate: "2027-01-15", amount: 2000 },
    { dueDate: "2027-02-15", amount: 2000 },
    { dueDate: "2027-03-15", amount: 2000 },
  ],
};

const settled = <T>(promise: Promise<T>) =>
  promise.catch((error: Error) => ({ thrown: error.message.slice(0, 120) }));

async function pairWithSale(sale: NewCreditSale = LICUADORA) {
  const ana = await seedUser("Ana");

  const rosa = await seedUser("Rosa");

  const group = await seedGroup(ana, rosa);

  await seedMovement(group.id, ana.id, "contribute", "500");

  await seedMovement(group.id, ana.id, "buy_inventory", "60");

  const created = await createCreditSale(group.id, ana.id, sale);

  if (!created.ok) {
    throw new Error(`seed sale failed: ${created.error.kind}`);
  }

  return { ana, rosa, group, saleId: created.value.saleId };
}

async function saleOf(groupId: string, saleId: string) {
  const sale = await getCreditSale(groupId, saleId);

  if (!sale.ok) {
    throw new Error("sale missing");
  }

  return sale.value;
}

describe("collecting credit sale cuotas", () => {
  it("two collections of the same cuota at once book a single cobro", async () => {
    const { ana, rosa, group, saleId } = await pairWithSale();

    const [first] = (await saleOf(group.id, saleId)).pendingInstallments();

    const results = await Promise.all([
      collectSaleInstallment(group.id, ana.id, saleId, first.id, TODAY),
      collectSaleInstallment(group.id, rosa.id, saleId, first.id, TODAY),
    ]);

    const cobros = (await listMovements(group.id)).filter(
      (movement) => movement.type === "collect_sale",
    );

    expect(results.filter((result) => result.ok)).toHaveLength(1);

    expect(cobros).toHaveLength(2);
  });

  it("a voided sale cannot be collected", async () => {
    const { ana, rosa, group, saleId } = await pairWithSale();

    const proposed = await proposeVoidCreditSale(group.id, ana.id, saleId);

    if (!proposed.ok) throw new Error("propose failed");

    await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    );

    const [first] = (await saleOf(group.id, saleId)).pendingInstallments();

    const late = await collectSaleInstallment(
      group.id,
      ana.id,
      saleId,
      first.id,
      TODAY,
    );

    expect(!late.ok && late.error.kind).toBe("CreditSaleVoided");
  });

  it("the cost recovered by all cobros adds up to the cost even when the last two are collected at once", async () => {
    const { ana, rosa, group, saleId } = await pairWithSale({
      ...LICUADORA,
      price: 10000,
      cost: 3333,
      downPayment: 0,
      installments: [
        { dueDate: "2026-12-15", amount: 3333 },
        { dueDate: "2027-01-15", amount: 3333 },
        { dueDate: "2027-02-15", amount: 3334 },
      ],
    });

    const [first, second, third] = (
      await saleOf(group.id, saleId)
    ).pendingInstallments();

    await collectSaleInstallment(group.id, ana.id, saleId, first.id, TODAY);

    await Promise.all([
      collectSaleInstallment(group.id, ana.id, saleId, second.id, TODAY),
      collectSaleInstallment(group.id, rosa.id, saleId, third.id, TODAY),
    ]);

    const recovered = (await saleOf(group.id, saleId))
      .collectedInstallments()
      .reduce((sum, installment) => sum + (installment.costShare ?? 0), 0);

    expect(recovered).toBe(3333);
  });
});

describe("re-planning", () => {
  it("two re-plans at once never leave the buyer owing more than the price", async () => {
    const { ana, rosa, group, saleId } = await pairWithSale();

    const twoCuotas = [
      { dueDate: "2026-12-15", amount: 4000 },
      { dueDate: "2027-01-15", amount: 4000 },
    ];

    const eightCuotas = Array.from({ length: 8 }, (_, index) => ({
      dueDate: `2027-${String(index + 1).padStart(2, "0")}-15`,
      amount: 1000,
    }));

    await Promise.allSettled([
      replanCreditSale(group.id, ana.id, saleId, twoCuotas),
      replanCreditSale(group.id, rosa.id, saleId, eightCuotas),
    ]);

    const sale = await saleOf(group.id, saleId);

    expect(sale.pendingAmount() + sale.collectedAmount()).toBe(10000);
  });

  it("a re-plan racing a cobro never leaves the buyer owing more than the price", async () => {
    const failures: string[] = [];

    for (let round = 0; round < 5; round++) {
      await truncateAll();

      const { ana, rosa, group, saleId } = await pairWithSale();

      const [first] = (await saleOf(group.id, saleId)).pendingInstallments();

      await Promise.allSettled([
        collectSaleInstallment(group.id, rosa.id, saleId, first.id, TODAY),
        replanCreditSale(group.id, ana.id, saleId, [
          { dueDate: "2027-06-15", amount: 8000 },
        ]),
      ]);

      const sale = await saleOf(group.id, saleId);

      const owed = sale.pendingAmount() + sale.collectedAmount();

      if (owed !== 10000) {
        failures.push(`round ${round}: collected+pending = ${owed}`);
      }
    }

    expect(failures).toEqual([]);
  }, 120_000);

  it("a voided sale cannot be re-planned", async () => {
    const { ana, rosa, group, saleId } = await pairWithSale();

    const proposed = await proposeVoidCreditSale(group.id, ana.id, saleId);

    if (!proposed.ok) throw new Error("propose failed");

    await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    );

    const replan = await replanCreditSale(group.id, ana.id, saleId, [
      { dueDate: "2027-06-15", amount: 8000 },
    ]);

    expect(!replan.ok && replan.error.kind).toBe("CreditSaleVoided");
  });

  it("a re-plan must add up to what is pending", async () => {
    const { ana, group, saleId } = await pairWithSale();

    const replan = await replanCreditSale(group.id, ana.id, saleId, [
      { dueDate: "2027-06-15", amount: 1 },
    ]);

    expect(!replan.ok && replan.error.kind).toBe("ScheduleMismatch");
  });
});

describe("createCreditSale input validation", () => {
  async function soloWithStock() {
    const ana = await seedUser("Ana");

    const group = await seedGroup(ana);

    await seedMovement(group.id, ana.id, "contribute", "500");

    return { ana, group };
  }

  it.each([
    ["impossible start date", { startDate: "2026-02-30" }],
    ["garbage start date", { startDate: "mañana" }],
    [
      "unknown frequency",
      { frequency: "yearly" as NewCreditSale["frequency"] },
    ],
    [
      "impossible cuota due date",
      {
        installments: [
          { dueDate: "2026-12-15", amount: 4000 },
          { dueDate: "2027-02-30", amount: 4000 },
        ],
      },
    ],
  ])("returns an error instead of crashing on %s", async (_label, over) => {
    const { ana, group } = await soloWithStock();

    const result = await settled(
      createCreditSale(group.id, ana.id, { ...LICUADORA, ...over }),
    );

    expect(result).toMatchObject({ ok: false });
  });

  it("refuses a price beyond what the ledger can store, without crashing", async () => {
    const { ana, group } = await soloWithStock();

    const result = await settled(
      createCreditSale(group.id, ana.id, {
        ...LICUADORA,
        price: 3_000_000_000,
        cost: null,
        downPayment: 0,
        installments: [{ dueDate: "2026-12-15", amount: 3_000_000_000 }],
      }),
    );

    expect(result).toMatchObject({ ok: false });
  });

  it("caps the length of the item and the buyer's name", async () => {
    const { ana, group } = await soloWithStock();

    const result = await createCreditSale(group.id, ana.id, {
      ...LICUADORA,
      item: "x".repeat(100_000),
      buyer: { name: "y".repeat(100_000) },
    });

    expect(result.ok).toBe(false);
  });

  it("a crash mid-sale leaves no partial writes", async () => {
    const { ana, group } = await soloWithStock();

    await settled(
      createCreditSale(group.id, ana.id, {
        ...LICUADORA,
        frequency: "yearly" as NewCreditSale["frequency"],
      }),
    );

    const rows = await db
      .select()
      .from(Movements)
      .where(eq(Movements.groupId, group.id));

    expect(rows.map((row) => row.type)).toEqual(["contribute"]);

    expect(await db.select().from(Contacts)).toHaveLength(0);
  });
});

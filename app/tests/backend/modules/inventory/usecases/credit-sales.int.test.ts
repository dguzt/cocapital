/**
 * Integration: a venta en cuotas from sale to settlement, re-plan and void.
 * The capital total never drops when selling on credit, and voiding brings it
 * back to exactly where it was before the sale.
 */

import {
  addMovement,
  collectSaleInstallment,
  createCreditSale,
  createGroup,
  decideMovementChange,
  getCreditSale,
  getSaleTargetForMovement,
  joinGroup,
  listContacts,
  listCreditSales,
  listGroupInstallments,
  listMovements,
  listPendingChanges,
  listPlanChanges,
  proposeMovementChange,
  proposeVoidCreditSale,
  replanCreditSale,
} from "@tests/support/use-cases";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Users } from "@/backend/infra/db/schema";
import { CapitalSummary } from "@/backend/modules/capital/domain/capital-summary";
import type { NewCreditSale } from "@/backend/modules/inventory/domain/new-credit-sale";
import { ManualMovement } from "@/backend/modules/movements/domain/manual-movement";
import { truncateAll } from "@/test/truncate";

const TODAY = "2026-10-18";

async function seed() {
  const [ana] = await db
    .insert(Users)
    .values({ clerkId: "clerk_ana", name: "Ana", email: "a@test.pe" })
    .returning();

  const [rosa] = await db
    .insert(Users)
    .values({ clerkId: "clerk_rosa", name: "Rosa", email: "r@test.pe" })
    .returning();

  const created = await createGroup(ana, "Inversiones DR");

  if (!created.ok) {
    throw new Error("seed failed");
  }

  await joinGroup(rosa, created.value.inviteCode.value);

  for (const form of [
    { type: "contribute", amountSoles: "500" },
    { type: "buy_inventory", amountSoles: "60" },
  ]) {
    const movement = ManualMovement.parse({ ...form, today: TODAY });

    if (!movement.ok) {
      throw new Error("seed failed");
    }

    await addMovement(created.value.id, ana.id, movement.value);
  }

  return { ana, rosa, group: created.value };
}

/** Licuadora: S/100, cost S/60, S/20 down, 4 monthly cuotas of S/20. */
const LICUADORA: NewCreditSale = {
  buyer: { name: "Juan" },
  item: "Licuadora",
  price: 10000,
  cost: 6000,
  downPayment: 2000,
  frequency: "monthly",
  startDate: TODAY,
  installments: [
    { dueDate: "2026-11-18", amount: 2000 },
    { dueDate: "2026-12-18", amount: 2000 },
    { dueDate: "2027-01-18", amount: 2000 },
    { dueDate: "2027-02-18", amount: 2000 },
  ],
};

async function capitalOf(groupId: string) {
  return CapitalSummary.derive(
    await listMovements(groupId),
    await listGroupInstallments(groupId),
  );
}

async function sellLicuadora(groupId: string, userId: string) {
  const created = await createCreditSale(groupId, userId, LICUADORA);

  if (!created.ok) {
    throw new Error(created.error.message);
  }

  const sale = await getCreditSale(groupId, created.value.saleId);

  if (!sale.ok) {
    throw new Error("sale missing");
  }

  return sale.value;
}

beforeEach(truncateAll);

describe("vender en cuotas", () => {
  it("moves cost from inventory to receivable and collects the down payment", async () => {
    const { ana, group } = await seed();

    const before = await capitalOf(group.id);

    const sale = await sellLicuadora(group.id, ana.id);

    expect(sale.buyer.name).toBe("Juan");
    expect(sale.installments.map((row) => [row.number, row.status])).toEqual([
      [0, "collected"],
      [1, "pending"],
      [2, "pending"],
      [3, "pending"],
      [4, "pending"],
    ]);
    expect(sale.installments[0].costShare).toBe(1200);

    const after = await capitalOf(group.id);

    expect(after).toMatchObject({
      cash: before.cash + 2000,
      inventory: 0,
      receivable: 4800,
      salesProfit: 800,
      expectedSalesMargin: 3200,
      total: before.total + 800,
    });

    const ledger = await listMovements(group.id);

    expect(
      ledger
        .map((movement) => movement.type)
        .slice(0, 2)
        .sort(),
    ).toEqual(["collect_sale", "sell_on_credit"]);
    expect(await listContacts(group.id)).toHaveLength(1);
  });

  it("a schedule that does not add up writes nothing", async () => {
    const { ana, group } = await seed();

    const before = await listMovements(group.id);

    const result = await createCreditSale(group.id, ana.id, {
      ...LICUADORA,
      installments: [{ dueDate: "2026-11-18", amount: 7999 }],
    });

    expect(!result.ok && result.error.kind).toBe("ScheduleMismatch");
    expect(await listMovements(group.id)).toHaveLength(before.length);
    expect(await listContacts(group.id)).toHaveLength(0);
  });

  it("collecting every cuota recovers exactly the cost and earns the margin", async () => {
    const { ana, group } = await seed();

    const before = await capitalOf(group.id);

    const sale = await sellLicuadora(group.id, ana.id);

    for (const installment of sale.pendingInstallments().reverse()) {
      const result = await collectSaleInstallment(
        group.id,
        ana.id,
        sale.id,
        installment.id,
        TODAY,
      );

      expect(result.ok).toBe(true);
    }

    const settled = await getCreditSale(group.id, sale.id);

    expect(settled.ok && settled.value.isSettled()).toBe(true);

    expect(await capitalOf(group.id)).toMatchObject({
      cash: before.cash + 10000,
      inventory: 0,
      receivable: 0,
      salesProfit: 4000,
      expectedSalesMargin: 0,
      total: before.total + 4000,
    });
  });

  it("a cuota cannot be collected twice", async () => {
    const { ana, group } = await seed();

    const sale = await sellLicuadora(group.id, ana.id);

    const cuota = sale.pendingInstallments()[0];

    await collectSaleInstallment(group.id, ana.id, sale.id, cuota.id, TODAY);

    const again = await collectSaleInstallment(
      group.id,
      ana.id,
      sale.id,
      cuota.id,
      TODAY,
    );

    expect(!again.ok && again.error.kind).toBe("InstallmentNotCollectable");
  });
});

describe("cambiar plan", () => {
  it("rewrites the pending cuotas, records it and leaves the capital alone", async () => {
    const { ana, group } = await seed();

    const sale = await sellLicuadora(group.id, ana.id);

    const before = await capitalOf(group.id);

    const result = await replanCreditSale(group.id, ana.id, sale.id, [
      { dueDate: "2026-11-18", amount: 4000 },
      { dueDate: "2026-12-18", amount: 4000 },
    ]);

    expect(result.ok && result.value).toEqual({ fromCount: 4, toCount: 2 });

    const replanned = await getCreditSale(group.id, sale.id);

    expect(
      replanned.ok &&
        replanned.value.installments.map((row) => [row.number, row.amount]),
    ).toEqual([
      [0, 2000],
      [1, 4000],
      [2, 4000],
    ]);
    expect(await capitalOf(group.id)).toEqual(before);

    const [change] = await listPlanChanges(group.id);

    expect(change).toMatchObject({
      buyerName: "Juan",
      item: "Licuadora",
      fromCount: 4,
      toCount: 2,
      authorName: "Ana",
    });
  });

  it("refuses new cuotas that do not add up to what is pending", async () => {
    const { ana, group } = await seed();

    const sale = await sellLicuadora(group.id, ana.id);

    const result = await replanCreditSale(group.id, ana.id, sale.id, [
      { dueDate: "2026-11-18", amount: 8500 },
    ]);

    expect(!result.ok && result.error.kind).toBe("ScheduleMismatch");
    expect(await listPlanChanges(group.id)).toHaveLength(0);
  });
});

describe("anular una venta en cuotas", () => {
  it("needs the partner's OK and then voids the sale and every cobro", async () => {
    const { ana, rosa, group } = await seed();

    const beforeSale = await capitalOf(group.id);

    const sale = await sellLicuadora(group.id, ana.id);

    await collectSaleInstallment(
      group.id,
      ana.id,
      sale.id,
      sale.pendingInstallments()[0].id,
      TODAY,
    );

    const proposed = await proposeVoidCreditSale(group.id, ana.id, sale.id);

    if (!proposed.ok) {
      throw new Error(proposed.error.message);
    }

    const [pending] = await listPendingChanges(group.id);

    expect(pending.before.type).toBe("sell_on_credit");

    const approved = await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    );

    expect(approved.ok && approved.value.applied).toBe(true);

    const voided = await getCreditSale(group.id, sale.id);

    expect(voided.ok && voided.value.status).toBe("voided");
    expect(await capitalOf(group.id)).toEqual(beforeSale);

    const again = await proposeVoidCreditSale(group.id, ana.id, sale.id);

    expect(!again.ok && again.error.kind).toBe("CreditSaleVoided");
  });

  it("undoing one cobro reopens its cuota once the partner approves", async () => {
    const { ana, rosa, group } = await seed();

    const sale = await sellLicuadora(group.id, ana.id);

    const beforeCobro = await capitalOf(group.id);

    const cuota = sale.pendingInstallments()[0];

    await collectSaleInstallment(group.id, ana.id, sale.id, cuota.id, TODAY);

    const collected = await getCreditSale(group.id, sale.id);

    const movementId =
      (collected.ok &&
        collected.value.installments.find((row) => row.id === cuota.id)
          ?.collectMovementId) ||
      "";

    const target = await getSaleTargetForMovement(
      group.id,
      movementId,
      "collect_sale",
    );

    expect(target).toEqual({ saleId: sale.id, installmentId: cuota.id });

    const proposed = await proposeMovementChange(
      group.id,
      ana.id,
      movementId,
      "void",
    );

    if (!proposed.ok) {
      throw new Error(proposed.error.message);
    }

    await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    );

    const reopened = await getCreditSale(group.id, sale.id);

    expect(
      reopened.ok &&
        reopened.value.installments.find((row) => row.id === cuota.id)?.status,
    ).toBe("pending");
    expect(await capitalOf(group.id)).toEqual(beforeCobro);
  });

  it("the ledger refuses to edit or void a credit sale's movements directly", async () => {
    const { ana, group } = await seed();

    const sale = await sellLicuadora(group.id, ana.id);

    const voidSale = await proposeMovementChange(
      group.id,
      ana.id,
      sale.saleMovementId,
      "void",
    );

    expect(!voidSale.ok && voidSale.error.kind).toBe("SystemMovement");

    const downPayment = sale.installments[0].collectMovementId ?? "";

    const editCobro = await proposeMovementChange(
      group.id,
      ana.id,
      downPayment,
      "edit",
      {
        type: "collect_sale",
        amount: 1,
        cost: 1,
        concept: null,
        date: TODAY,
      },
    );

    expect(!editCobro.ok && editCobro.error.kind).toBe("SystemMovement");
  });

  it("lists the group's sales only", async () => {
    const { ana, group } = await seed();

    await sellLicuadora(group.id, ana.id);

    const sales = await listCreditSales(group.id);

    expect(sales).toHaveLength(1);
    expect(sales[0].collectedAmount()).toBe(2000);
    expect(sales[0].pendingAmount()).toBe(8000);
  });
});

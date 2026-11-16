/**
 * Server actions can be POSTed to any route, the public "/" included, so the
 * proxy is not their guard. Each action must refuse an anonymous visitor and
 * a partner who is not in the group, the same way for a group that exists
 * and one that does not, and write nothing.
 */

import { proposeEditOverTheWire } from "@tests/security/support/over-the-wire";

import type { Tenants } from "@tests/security/tenancy/support/seed";
import { seedTenants, TODAY } from "@tests/security/tenancy/support/seed";
import { NOT_FOUND, signInAs } from "@tests/security/tenancy/support/session";
import { listMovements, listPendingChanges } from "@tests/support/use-cases";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Groups } from "@/backend/infra/db/schema";
import { createGroupAction } from "@/backend/modules/groups/adapters/in/next/create-group-action";
import {
  collectSaleInstallmentAction,
  createCreditSaleAction,
  getSaleTargetForMovementAction,
  proposeVoidCreditSaleAction,
  replanCreditSaleAction,
} from "@/backend/modules/inventory/adapters/in/next/credit-sale-actions";
import {
  collectInstallmentAction,
  createLoanAction,
  getLoanTargetForMovementAction,
  proposeVoidLoanAction,
} from "@/backend/modules/loans/adapters/in/next/loan-actions";
import {
  addMovementAction,
  decideChangeAction,
  getMovementHistoryAction,
  proposeVoidAction,
} from "@/backend/modules/movements/adapters/in/next/movement-actions";
import { truncateAll } from "@/test/truncate";

vi.mock("@clerk/nextjs/server", async () => {
  const { fakeAuth } = await import("@tests/security/tenancy/support/session");

  return {
    auth: fakeAuth,
    clerkClient: async () => {
      throw new Error("Clerk is not reachable from tests");
    },
  };
});

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

beforeEach(truncateAll);

/** Every group-scoped action, aimed at group B with B's own ids. */
function everyActionOn(groupId: string, t: Tenants) {
  return {
    addMovementAction: () =>
      addMovementAction(groupId, { type: "contribute", amountSoles: "5" }),
    proposeEditAction: () =>
      proposeEditOverTheWire(
        groupId,
        t.b.movement.id,
        { amountSoles: "1", concept: "x" },
        {
          type: "contribute",
          amount: 100,
          cost: null,
          concept: null,
          date: TODAY,
        },
      ),
    proposeVoidAction: () => proposeVoidAction(groupId, t.b.movement.id),
    decideChangeAction: () =>
      decideChangeAction(groupId, t.b.pendingId, "approve"),
    getMovementHistoryAction: () =>
      getMovementHistoryAction(groupId, t.b.pendingTarget.id),
    createLoanAction: () =>
      createLoanAction(groupId, {
        borrower: { name: "X" },
        capital: 100,
        rateBps: 0,
        frequency: "monthly",
        startDate: TODAY,
        installments: [
          {
            number: 1,
            dueDate: "2026-12-15",
            amount: 100,
            principal: 100,
            interest: 0,
          },
        ],
      }),
    collectInstallmentAction: () =>
      collectInstallmentAction(groupId, t.b.loanId, t.b.pendingCuotaId),
    proposeVoidLoanAction: () => proposeVoidLoanAction(groupId, t.b.loanId),
    getLoanTargetForMovementAction: () =>
      getLoanTargetForMovementAction(groupId, t.b.lendMovementId, "lend"),
    createCreditSaleAction: () =>
      createCreditSaleAction(groupId, {
        buyer: { name: "X" },
        item: "X",
        price: 100,
        cost: null,
        downPayment: 0,
        frequency: "monthly",
        startDate: TODAY,
        installments: [{ dueDate: "2026-12-15", amount: 100 }],
      }),
    collectSaleInstallmentAction: () =>
      collectSaleInstallmentAction(groupId, t.b.saleId, t.b.salePendingCuotaId),
    replanCreditSaleAction: () =>
      replanCreditSaleAction(groupId, t.b.saleId, [
        { dueDate: "2030-01-01", amount: 8000 },
      ]),
    proposeVoidCreditSaleAction: () =>
      proposeVoidCreditSaleAction(groupId, t.b.saleId),
    getSaleTargetForMovementAction: () =>
      getSaleTargetForMovementAction(
        groupId,
        t.b.saleMovementId,
        "sell_on_credit",
      ),
  };
}

describe("an anonymous visitor", () => {
  it("is refused by every group action and writes nothing", async () => {
    const t = await seedTenants();
    const ledgerBefore = await listMovements(t.groupB.id);
    signInAs(null);

    for (const [name, call] of Object.entries(everyActionOn(t.groupB.id, t))) {
      await expect(call(), name).rejects.toThrow(
        "unauthenticated request past the proxy guard",
      );
    }

    expect(await listMovements(t.groupB.id)).toEqual(ledgerBefore);
  });

  it("cannot found a group", async () => {
    await seedTenants();
    const groupsBefore = await db.select().from(Groups);
    signInAs(null);

    const form = new FormData();
    form.set("name", "Anon");

    await expect(createGroupAction(form)).rejects.toThrow(
      "unauthenticated request past the proxy guard",
    );

    expect(await db.select().from(Groups)).toHaveLength(groupsBefore.length);
  });
});

describe("a signed-in partner who is not in group B", () => {
  it("gets a 404 from every action on B and writes nothing", async () => {
    const t = await seedTenants();
    const ledgerBefore = await listMovements(t.groupB.id);
    const pendingBefore = await listPendingChanges(t.groupB.id);

    for (const clerkId of ["clerk_ana", "clerk_outsider"]) {
      signInAs(clerkId);

      for (const [name, call] of Object.entries(
        everyActionOn(t.groupB.id, t),
      )) {
        await expect(call(), `${clerkId} ${name}`).rejects.toMatchObject(
          NOT_FOUND,
        );
      }
    }

    expect(await listMovements(t.groupB.id)).toEqual(ledgerBefore);
    expect(await listPendingChanges(t.groupB.id)).toEqual(pendingBefore);
  });

  it("gets the same 404 for B as for a group that does not exist", async () => {
    const t = await seedTenants();
    signInAs("clerk_outsider");

    for (const groupId of [
      "00000000-0000-4000-8000-000000000000",
      "not-a-uuid",
      "",
    ]) {
      for (const [name, call] of Object.entries(everyActionOn(groupId, t))) {
        await expect(call(), `${groupId} ${name}`).rejects.toMatchObject(
          NOT_FOUND,
        );
      }
    }
  });
});

/**
 * Every server action, called by a member of group A with A's id and the id
 * of something that lives in group B. Nothing of B may be read or changed,
 * and the answer must be the same one a made-up id gets.
 */

import { proposeEditOverTheWire } from "@tests/security/support/over-the-wire";

import { seedTenants, TODAY } from "@tests/security/tenancy/support/seed";
import { signInAs } from "@tests/security/tenancy/support/session";
import {
  getCreditSale,
  getLoanDetail,
  listMovementHistory,
  listMovements,
  listPendingChanges,
} from "@tests/support/use-cases";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

const MADE_UP = "00000000-0000-4000-8000-000000000000";

beforeEach(truncateAll);

async function stateOfB(groupId: string, loanId: string, saleId: string) {
  return {
    ledger: await listMovements(groupId),
    pending: await listPendingChanges(groupId),
    loan: await getLoanDetail(groupId, loanId),
    sale: await getCreditSale(groupId, saleId),
  };
}

describe(
  "a member of A aiming at B's ids from A's group",
  { timeout: 120_000 },
  () => {
    it("cannot collect B's loan cuota", async () => {
      const t = await seedTenants();
      const before = await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId);
      signInAs("clerk_ana");

      const result = await collectInstallmentAction(
        t.groupA.id,
        t.b.loanId,
        t.b.pendingCuotaId,
      );
      const madeUp = await collectInstallmentAction(
        t.groupA.id,
        MADE_UP,
        MADE_UP,
      );

      expect(result).toEqual({ ok: false, error: "LoanNotFound" });
      expect(madeUp).toEqual(result);
      expect(await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId)).toEqual(
        before,
      );
    });

    it("cannot cancel B's loan", async () => {
      const t = await seedTenants();
      const before = await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId);
      signInAs("clerk_ana");

      const result = await proposeVoidLoanAction(t.groupA.id, t.b.loanId);

      expect(result).toEqual({ ok: false, error: "LoanNotFound" });
      expect(await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId)).toEqual(
        before,
      );
    });

    it("cannot resolve B's lend or repay movement to its loan", async () => {
      const t = await seedTenants();
      signInAs("clerk_ana");

      expect(
        await getLoanTargetForMovementAction(
          t.groupA.id,
          t.b.lendMovementId,
          "lend",
        ),
      ).toEqual({ ok: true, target: null });

      expect(
        await getLoanTargetForMovementAction(
          t.groupA.id,
          t.b.repayMovementId,
          "repay",
        ),
      ).toEqual({ ok: true, target: null });
    });

    it("cannot lend to B's contact", async () => {
      const t = await seedTenants();
      signInAs("clerk_ana");

      const result = await createLoanAction(t.groupA.id, {
        borrower: { id: t.b.contactId },
        capital: 1000,
        rateBps: 0,
        frequency: "monthly",
        startDate: TODAY,
        installments: [
          {
            number: 1,
            dueDate: "2026-12-15",
            amount: 1000,
            principal: 1000,
            interest: 0,
          },
        ],
      });

      expect(result).toEqual({ ok: false, error: "ContactNotFound" });
    });

    it("cannot write a loan into B by smuggling groupId and userId in the input", async () => {
      const t = await seedTenants();
      const before = await listMovements(t.groupB.id);
      signInAs("clerk_ana");

      const result = await createLoanAction(t.groupA.id, {
        borrower: { name: "Smuggled" },
        capital: 1000,
        rateBps: 0,
        frequency: "monthly",
        startDate: TODAY,
        installments: [
          {
            number: 1,
            dueDate: "2026-12-15",
            amount: 1000,
            principal: 1000,
            interest: 0,
          },
        ],
        ...{ groupId: t.groupB.id, userId: t.bea.id },
      });

      expect(result.ok).toBe(true);
      expect(await listMovements(t.groupB.id)).toEqual(before);
    });

    it("cannot collect B's credit-sale cuota", async () => {
      const t = await seedTenants();
      const before = await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId);
      signInAs("clerk_ana");

      const result = await collectSaleInstallmentAction(
        t.groupA.id,
        t.b.saleId,
        t.b.salePendingCuotaId,
      );

      expect(result).toEqual({ ok: false, error: "CreditSaleNotFound" });
      expect(await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId)).toEqual(
        before,
      );
    });

    it("cannot re-plan B's credit sale", async () => {
      const t = await seedTenants();
      const before = await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId);
      signInAs("clerk_ana");

      const result = await replanCreditSaleAction(t.groupA.id, t.b.saleId, [
        { dueDate: "2030-01-01", amount: 8000 },
      ]);

      expect(result).toEqual({ ok: false, error: "CreditSaleNotFound" });
      expect(await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId)).toEqual(
        before,
      );
    });

    it("cannot cancel B's credit sale", async () => {
      const t = await seedTenants();
      const before = await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId);
      signInAs("clerk_ana");

      const result = await proposeVoidCreditSaleAction(t.groupA.id, t.b.saleId);

      expect(result).toEqual({ ok: false, error: "CreditSaleNotFound" });
      expect(await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId)).toEqual(
        before,
      );
    });

    it("cannot resolve B's sale or cobro movement to its sale", async () => {
      const t = await seedTenants();
      signInAs("clerk_ana");

      expect(
        await getSaleTargetForMovementAction(
          t.groupA.id,
          t.b.saleMovementId,
          "sell_on_credit",
        ),
      ).toEqual({ ok: true, target: null });

      expect(
        await getSaleTargetForMovementAction(
          t.groupA.id,
          t.b.collectSaleMovementId,
          "collect_sale",
        ),
      ).toEqual({ ok: true, target: null });
    });

    it("cannot sell on credit to B's contact", async () => {
      const t = await seedTenants();
      signInAs("clerk_ana");

      const result = await createCreditSaleAction(t.groupA.id, {
        buyer: { id: t.b.contactId },
        item: "Radio",
        price: 1000,
        cost: null,
        downPayment: 0,
        frequency: "monthly",
        startDate: TODAY,
        installments: [{ dueDate: "2026-12-15", amount: 1000 }],
      });

      expect(result).toEqual({ ok: false, error: "ContactNotFound" });
    });

    it("cannot add a movement to B by smuggling groupId and userId in the form", async () => {
      const t = await seedTenants();
      const before = await listMovements(t.groupB.id);
      signInAs("clerk_ana");

      const result = await addMovementAction(t.groupA.id, {
        type: "contribute",
        amountSoles: "5",
        ...{ groupId: t.groupB.id, userId: t.bea.id },
      });

      expect(result).toEqual({ ok: true });
      expect(await listMovements(t.groupB.id)).toEqual(before);
    });

    it("cannot edit B's movement", async () => {
      const t = await seedTenants();
      const before = await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId);
      signInAs("clerk_ana");

      const result = await proposeEditOverTheWire(
        t.groupA.id,
        t.b.movement.id,
        { amountSoles: "1", concept: "x" },
        {
          type: "contribute",
          amount: 100,
          cost: null,
          concept: null,
          date: TODAY,
        },
      );

      expect(result).toEqual({ ok: false, error: "MovementNotFound" });
      expect(await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId)).toEqual(
        before,
      );
    });

    it("cannot void B's movements, nor undo B's cobros through their repay/collect_sale", async () => {
      const t = await seedTenants();
      const before = await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId);
      signInAs("clerk_ana");

      for (const movementId of [
        t.b.movement.id,
        t.b.repayMovementId,
        t.b.collectSaleMovementId,
        t.b.lendMovementId,
        t.b.saleMovementId,
      ]) {
        expect(await proposeVoidAction(t.groupA.id, movementId)).toEqual({
          ok: false,
          error: "MovementNotFound",
        });
      }

      expect(await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId)).toEqual(
        before,
      );
    });

    it("cannot approve or reject B's pending change", async () => {
      const t = await seedTenants();
      const before = await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId);
      signInAs("clerk_ana");

      for (const decision of ["approve", "reject"] as const) {
        expect(
          await decideChangeAction(t.groupA.id, t.b.pendingId, decision),
        ).toEqual({ ok: false, error: "ChangeNotFound" });
      }

      expect(await stateOfB(t.groupB.id, t.b.loanId, t.b.saleId)).toEqual(
        before,
      );
    });

    it("cannot read the change history of B's movement", async () => {
      const t = await seedTenants();
      signInAs("clerk_ana");

      expect(
        await listMovementHistory(t.groupB.id, t.b.pendingTarget.id),
      ).toHaveLength(1);

      expect(
        await getMovementHistoryAction(t.groupA.id, t.b.pendingTarget.id),
      ).toEqual({ ok: true, history: [] });
    });
  },
);

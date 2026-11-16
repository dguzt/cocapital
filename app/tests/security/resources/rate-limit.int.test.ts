/**
 * A partner past their write quota is turned away by every write action
 * before anything is written.
 */

import { signInAs } from "@tests/security/tenancy/support/session";
import { createGroup, listMovements } from "@tests/support/use-cases";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Groups, Users } from "@/backend/infra/db/schema";
import { createGroupAction } from "@/backend/modules/groups/adapters/in/next/create-group-action";
import {
  collectSaleInstallmentAction,
  createCreditSaleAction,
  proposeVoidCreditSaleAction,
  replanCreditSaleAction,
} from "@/backend/modules/inventory/adapters/in/next/credit-sale-actions";
import type { NewCreditSale } from "@/backend/modules/inventory/domain/new-credit-sale";
import {
  collectInstallmentAction,
  createLoanAction,
  proposeVoidLoanAction,
} from "@/backend/modules/loans/adapters/in/next/loan-actions";
import type { NewLoan } from "@/backend/modules/loans/domain/new-loan";
import {
  addMovementAction,
  decideChangeAction,
  proposeEditAction,
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

const NO_ID = "00000000-0000-0000-0000-000000000000";

async function partnerInAGroup() {
  const [ana] = await db
    .insert(Users)
    .values({ clerkId: "auth_ana", name: "Ana", email: "ana@test.pe" })
    .returning();

  const group = await createGroup(ana, "Grupo de Ana");

  if (!group.ok) {
    throw new Error("seed failed: group");
  }

  signInAs("auth_ana");

  return { ana, groupId: group.value.id };
}

async function fillQuotaOf(userId: string) {
  await db.execute(sql`
    insert into rate_limit_windows (key, window_seconds, window_start, hits)
    values
      (${`writes:${userId}`}, 60, to_timestamp(floor(extract(epoch from now()) / 60) * 60), 60),
      (${`writes:${userId}`}, 86400, to_timestamp(floor(extract(epoch from now()) / 86400) * 86400), 1000)
  `);
}

function everyWriteActionOn(groupId: string) {
  return {
    addMovementAction: () =>
      addMovementAction(groupId, { type: "contribute", amountSoles: "5" }),
    proposeEditAction: () =>
      proposeEditAction(groupId, NO_ID, { amountSoles: "1", concept: "x" }),
    proposeVoidAction: () => proposeVoidAction(groupId, NO_ID),
    decideChangeAction: () => decideChangeAction(groupId, NO_ID, "approve"),
    createLoanAction: () => createLoanAction(groupId, {} as NewLoan),
    collectInstallmentAction: () =>
      collectInstallmentAction(groupId, NO_ID, NO_ID),
    proposeVoidLoanAction: () => proposeVoidLoanAction(groupId, NO_ID),
    createCreditSaleAction: () =>
      createCreditSaleAction(groupId, {} as NewCreditSale),
    collectSaleInstallmentAction: () =>
      collectSaleInstallmentAction(groupId, NO_ID, NO_ID),
    replanCreditSaleAction: () => replanCreditSaleAction(groupId, NO_ID, []),
    proposeVoidCreditSaleAction: () =>
      proposeVoidCreditSaleAction(groupId, NO_ID),
  };
}

describe("a partner past their write quota", () => {
  it("is refused by every group write action, which writes nothing", async () => {
    const { ana, groupId } = await partnerInAGroup();
    await fillQuotaOf(ana.id);

    for (const [name, call] of Object.entries(everyWriteActionOn(groupId))) {
      expect(await call(), name).toEqual({ ok: false, error: "RateLimited" });
    }

    expect(await listMovements(groupId)).toEqual([]);
  });

  it("cannot found another group", async () => {
    const { ana } = await partnerInAGroup();
    await fillQuotaOf(ana.id);

    const form = new FormData();
    form.set("name", "Otro grupo");

    await expect(createGroupAction(form)).rejects.toMatchObject({
      digest: expect.stringContaining("/grupos/nuevo?error=RateLimited"),
    });

    expect(await db.select().from(Groups)).toHaveLength(1);
  });

  it("still writes while under the quota", async () => {
    const { groupId } = await partnerInAGroup();

    const result = await addMovementAction(groupId, {
      type: "contribute",
      amountSoles: "5",
    });

    expect(result).toEqual({ ok: true });
  });
});

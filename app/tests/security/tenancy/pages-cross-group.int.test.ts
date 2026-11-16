/**
 * Every page under /g/[groupId], rendered as the server would: a partner who
 * is not in the group and an anonymous visitor get nothing, and the detail
 * pages never open another group's loan or sale from inside your own group.
 */

import type { Tenants } from "@tests/security/tenancy/support/seed";
import { seedTenants } from "@tests/security/tenancy/support/seed";
import { NOT_FOUND, signInAs } from "@tests/security/tenancy/support/session";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ActivityPage from "@/app/g/[groupId]/actividad/page";
import GroupLayout from "@/app/g/[groupId]/layout";
import PanelPage from "@/app/g/[groupId]/page";
import LoanDetailPage from "@/app/g/[groupId]/prestamos/[id]/page";
import NewLoanPage from "@/app/g/[groupId]/prestamos/nuevo/page";
import LoansPage from "@/app/g/[groupId]/prestamos/page";
import SaleDetailPage from "@/app/g/[groupId]/ventas/[id]/page";
import NewSalePage from "@/app/g/[groupId]/ventas/nueva/page";
import SalesPage from "@/app/g/[groupId]/ventas/page";
import NewGroupPage from "@/app/grupos/nuevo/page";
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

function everyPageOf(groupId: string, t: Tenants) {
  const params = Promise.resolve({ groupId });
  const searchParams = Promise.resolve({});

  return {
    layout: () => GroupLayout({ params, children: null } as never),
    panel: () => PanelPage({ params } as never),
    activity: () => ActivityPage({ params }),
    loans: () => LoansPage({ params } as never),
    newLoan: () => NewLoanPage({ params } as never),
    loanDetail: () =>
      LoanDetailPage({
        params: Promise.resolve({ groupId, id: t.b.loanId }),
        searchParams,
      }),
    sales: () => SalesPage({ params } as never),
    newSale: () => NewSalePage({ params } as never),
    saleDetail: () =>
      SaleDetailPage({ params: Promise.resolve({ groupId, id: t.b.saleId }) }),
  };
}

describe("pages of group B", () => {
  it("are a 404 for a partner who is not in B", async () => {
    const t = await seedTenants();

    for (const clerkId of ["clerk_ana", "clerk_outsider"]) {
      signInAs(clerkId);

      for (const [name, render] of Object.entries(
        everyPageOf(t.groupB.id, t),
      )) {
        await expect(render(), `${clerkId} ${name}`).rejects.toMatchObject(
          NOT_FOUND,
        );
      }
    }
  });

  it("refuse an anonymous visitor", async () => {
    const t = await seedTenants();
    signInAs(null);

    for (const [name, render] of Object.entries(everyPageOf(t.groupB.id, t))) {
      await expect(render(), name).rejects.toThrow(
        "unauthenticated request past the proxy guard",
      );
    }

    await expect(
      NewGroupPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("unauthenticated request past the proxy guard");
  });
});

describe("detail pages inside your own group", () => {
  it("do not open B's loan under A's url", async () => {
    const t = await seedTenants();
    signInAs("clerk_ana");

    await expect(
      LoanDetailPage({
        params: Promise.resolve({ groupId: t.groupA.id, id: t.b.loanId }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toMatchObject(NOT_FOUND);
  });

  it("do not open B's credit sale under A's url", async () => {
    const t = await seedTenants();
    signInAs("clerk_ana");

    await expect(
      SaleDetailPage({
        params: Promise.resolve({ groupId: t.groupA.id, id: t.b.saleId }),
      }),
    ).rejects.toMatchObject(NOT_FOUND);
  });
});

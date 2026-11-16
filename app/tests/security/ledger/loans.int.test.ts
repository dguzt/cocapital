import {
  seedGroup,
  seedLoan,
  seedMovement,
  seedUser,
  TODAY,
} from "@tests/security/ledger/seed";
import {
  collectInstallment,
  createLoan,
  decideMovementChange,
  getLoanDetail,
  listMovements,
  proposeMovementChange,
  proposeVoidLoan,
} from "@tests/support/use-cases";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Contacts, Installments, Movements } from "@/backend/infra/db/schema";
import type { NewLoan } from "@/backend/modules/loans/domain/new-loan";
import { truncateAll } from "@/test/truncate";

beforeEach(truncateAll);

async function soloWithCash() {
  const diego = await seedUser("Diego");

  const group = await seedGroup(diego);

  await seedMovement(group.id, diego.id, "contribute", "500");

  return { diego, group };
}

async function pairWithLoan() {
  const ana = await seedUser("Ana");

  const rosa = await seedUser("Rosa");

  const group = await seedGroup(ana, rosa);

  await seedMovement(group.id, ana.id, "contribute", "500");

  const loanId = await seedLoan(group.id, ana.id);

  const detail = await getLoanDetail(group.id, loanId);

  if (!detail.ok) {
    throw new Error("seed detail failed");
  }

  return { ana, rosa, group, loanId, installments: detail.value.installments };
}

const settled = <T>(promise: Promise<T>) =>
  promise.catch((error: Error) => ({ thrown: error.message.slice(0, 120) }));

const oneCuota = (over: Partial<NewLoan> = {}): NewLoan => ({
  borrower: { name: "Karina" },
  capital: 10000,
  rateBps: 1000,
  frequency: "monthly",
  startDate: TODAY,
  installments: [
    {
      number: 1,
      dueDate: "2026-12-15",
      amount: 11000,
      principal: 10000,
      interest: 1000,
    },
  ],
  ...over,
});

describe("collecting cuotas", () => {
  it("a cuota cannot be collected twice", async () => {
    const { ana, group, loanId, installments } = await pairWithLoan();

    await collectInstallment(
      group.id,
      ana.id,
      loanId,
      installments[0].id,
      TODAY,
    );

    const again = await collectInstallment(
      group.id,
      ana.id,
      loanId,
      installments[0].id,
      TODAY,
    );

    expect(!again.ok && again.error.kind).toBe("InstallmentNotCollectable");
  });

  it("two collections of the same cuota at once book a single repay", async () => {
    const { ana, rosa, group, loanId, installments } = await pairWithLoan();

    const results = await Promise.all([
      collectInstallment(group.id, ana.id, loanId, installments[0].id, TODAY),
      collectInstallment(group.id, rosa.id, loanId, installments[0].id, TODAY),
    ]);

    const repays = (await listMovements(group.id)).filter(
      (movement) => movement.type === "repay",
    );

    expect(results.filter((result) => result.ok)).toHaveLength(1);

    expect(repays).toHaveLength(1);
  });

  it("nothing more than the schedule can ever be collected", async () => {
    const { ana, group, loanId, installments } = await pairWithLoan();

    for (const installment of [...installments, ...installments]) {
      await collectInstallment(group.id, ana.id, loanId, installment.id, TODAY);
    }

    const repaid = (await listMovements(group.id))
      .filter((movement) => movement.type === "repay")
      .reduce((sum, movement) => sum + movement.amount, 0);

    expect(repaid).toBe(33000);
  });

  it("a voided loan cannot be collected", async () => {
    const { ana, rosa, group, loanId, installments } = await pairWithLoan();

    const proposed = await proposeVoidLoan(group.id, ana.id, loanId);

    if (!proposed.ok) throw new Error("propose failed");

    await decideMovementChange(
      group.id,
      rosa.id,
      proposed.value.pendingId,
      "approve",
    );

    const late = await collectInstallment(
      group.id,
      ana.id,
      loanId,
      installments[0].id,
      TODAY,
    );

    expect(!late.ok && late.error.kind).toBe("InstallmentNotCollectable");
  });

  it("another group's loan cannot be collected", async () => {
    const { group: victim, loanId, installments } = await pairWithLoan();

    const mallory = await seedUser("Mallory");

    const own = await seedGroup(mallory);

    const crossed = await collectInstallment(
      own.id,
      mallory.id,
      loanId,
      installments[0].id,
      TODAY,
    );

    expect(!crossed.ok && crossed.error.kind).toBe("LoanNotFound");

    expect(
      (await listMovements(victim.id)).filter((row) => row.type === "repay"),
    ).toHaveLength(0);
  });

  it("collecting while the loan is being voided never leaves a live repay on a voided loan", async () => {
    const failures: string[] = [];

    for (let round = 0; round < 5; round++) {
      await truncateAll();

      const diego = await seedUser("Diego");

      const group = await seedGroup(diego);

      await seedMovement(group.id, diego.id, "contribute", "500");

      const loanId = await seedLoan(group.id, diego.id);

      const detail = await getLoanDetail(group.id, loanId);

      if (!detail.ok) throw new Error("detail failed");

      await Promise.allSettled([
        proposeVoidLoan(group.id, diego.id, loanId, true),
        collectInstallment(
          group.id,
          diego.id,
          loanId,
          detail.value.installments[0].id,
          TODAY,
        ),
      ]);

      const after = await getLoanDetail(group.id, loanId);

      const liveRepays = (await listMovements(group.id)).filter(
        (movement) => movement.type === "repay" && movement.status === "active",
      );

      if (
        after.ok &&
        after.value.status === "voided" &&
        liveRepays.length > 0
      ) {
        failures.push(
          `round ${round}: voided loan with ${liveRepays.length} live repay`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it("a stale void of a repay approved after the loan was voided is refused", async () => {
    const { ana, rosa, group, loanId, installments } = await pairWithLoan();

    const collected = await collectInstallment(
      group.id,
      ana.id,
      loanId,
      installments[0].id,
      TODAY,
    );

    if (!collected.ok) throw new Error("collect failed");

    const [repay] = (await listMovements(group.id)).filter(
      (movement) => movement.type === "repay",
    );

    const repayVoid = await proposeMovementChange(
      group.id,
      ana.id,
      repay.id,
      "void",
    );

    const loanVoid = await proposeVoidLoan(group.id, ana.id, loanId);

    if (!repayVoid.ok || !loanVoid.ok) throw new Error("propose failed");

    await decideMovementChange(
      group.id,
      rosa.id,
      loanVoid.value.pendingId,
      "approve",
    );

    const stale = await decideMovementChange(
      group.id,
      rosa.id,
      repayVoid.value.pendingId,
      "approve",
    );

    const [cuota] = await db
      .select()
      .from(Installments)
      .where(eq(Installments.id, installments[0].id));

    expect(stale.ok).toBe(false);

    expect(cuota.status).toBe("collected");
  });
});

describe("createLoan input validation", () => {
  it("refuses a negative capital", async () => {
    const { diego, group } = await soloWithCash();

    const result = await createLoan(
      group.id,
      diego.id,
      oneCuota({
        capital: -10000,
        installments: [
          {
            number: 1,
            dueDate: "2026-12-15",
            amount: 100,
            principal: -10000,
            interest: 10100,
          },
        ],
      }),
    );

    const lends = (await listMovements(group.id)).filter(
      (movement) => movement.type === "lend",
    );

    expect(result.ok).toBe(false);

    expect(lends).toHaveLength(0);
  });

  it("refuses a zero capital", async () => {
    const { diego, group } = await soloWithCash();

    const result = await createLoan(
      group.id,
      diego.id,
      oneCuota({
        capital: 0,
        installments: [
          {
            number: 1,
            dueDate: "2026-12-15",
            amount: 5000,
            principal: 0,
            interest: 5000,
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("refuses a cuota with negative interest or negative principal", async () => {
    const { diego, group } = await soloWithCash();

    const result = await createLoan(
      group.id,
      diego.id,
      oneCuota({
        capital: 10000,
        installments: [
          {
            number: 1,
            dueDate: "2026-12-15",
            amount: 15000,
            principal: 15000,
            interest: 0,
          },
          {
            number: 2,
            dueDate: "2027-01-15",
            amount: 100,
            principal: -5000,
            interest: 5100,
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
  });

  it("refuses a negative rate", async () => {
    const { diego, group } = await soloWithCash();

    const result = await createLoan(
      group.id,
      diego.id,
      oneCuota({ rateBps: -5000 }),
    );

    expect(result.ok).toBe(false);
  });

  it("refuses more than 360 cuotas", async () => {
    const { diego, group } = await soloWithCash();

    const installments = Array.from({ length: 1000 }, (_, index) => ({
      number: index + 1,
      dueDate: "2026-12-15",
      amount: 10,
      principal: 10,
      interest: 0,
    }));

    const result = await createLoan(
      group.id,
      diego.id,
      oneCuota({ capital: 10000, installments }),
    );

    expect(result.ok).toBe(false);
  });

  it("refuses duplicate or out-of-order cuota numbers", async () => {
    const { diego, group } = await soloWithCash();

    const result = await createLoan(
      group.id,
      diego.id,
      oneCuota({
        installments: [
          {
            number: 1,
            dueDate: "2026-12-15",
            amount: 5500,
            principal: 5000,
            interest: 500,
          },
          {
            number: 1,
            dueDate: "2026-12-15",
            amount: 5500,
            principal: 5000,
            interest: 500,
          },
        ],
      }),
    );

    expect(result.ok).toBe(false);
  });

  it.each([
    ["impossible start date", { startDate: "2026-02-30" }],
    ["unknown frequency", { frequency: "yearly" as NewLoan["frequency"] }],
    [
      "fractional cents",
      {
        capital: 10050,
        installments: [
          {
            number: 1,
            dueDate: "2026-12-15",
            amount: 5025.5,
            principal: 5025,
            interest: 0.5,
          },
          {
            number: 2,
            dueDate: "2027-01-15",
            amount: 5024.5,
            principal: 5025,
            interest: -0.5,
          },
        ],
      },
    ],
    [
      "invalid cuota due date",
      {
        installments: [
          {
            number: 1,
            dueDate: "not-a-date",
            amount: 11000,
            principal: 10000,
            interest: 1000,
          },
        ],
      },
    ],
  ])("returns an error instead of crashing on %s", async (_label, over) => {
    const { diego, group } = await soloWithCash();

    const result = await settled(
      createLoan(group.id, diego.id, oneCuota(over)),
    );

    expect(result).toMatchObject({ ok: false });
  });

  it("a crash mid-loan leaves no partial writes", async () => {
    const { diego, group } = await soloWithCash();

    await settled(
      createLoan(
        group.id,
        diego.id,
        oneCuota({ frequency: "yearly" as NewLoan["frequency"] }),
      ),
    );

    const rows = await db
      .select()
      .from(Movements)
      .where(eq(Movements.groupId, group.id));

    expect(rows.map((row) => row.type)).toEqual(["contribute"]);

    expect(await db.select().from(Contacts)).toHaveLength(0);
  });
});

/**
 * Two tenants side by side. Group A is Ana alone (every change applies at
 * once); group A2 is Ana with Rosa; group B is Bea and Beto and holds one of
 * everything a partner of A could aim at.
 */
import {
  addMovement,
  collectInstallment,
  createCreditSale,
  createGroup,
  createLoan,
  getCreditSale,
  getLoanDetail,
  joinGroup,
  listContacts,
  proposeMovementChange,
} from "@tests/support/use-cases";
import { db } from "@/backend/infra/db/client";
import { Users } from "@/backend/infra/db/schema";
import { Schedule } from "@/backend/modules/loans/domain/schedule";
import { ManualMovement } from "@/backend/modules/movements/domain/manual-movement";

export const TODAY = "2026-11-15";

async function user(clerkId: string, name: string) {
  const [row] = await db
    .insert(Users)
    .values({ clerkId, name, email: `${clerkId}@test.pe` })
    .returning();

  return row;
}

async function group(creator: { id: string; name: string }, name: string) {
  const created = await createGroup(creator, name);

  if (!created.ok) {
    throw new Error("seed failed: group");
  }

  return created.value;
}

async function contribute(groupId: string, userId: string, soles: string) {
  const parsed = ManualMovement.parse({
    type: "contribute",
    amountSoles: soles,
    today: TODAY,
  });

  if (!parsed.ok) {
    throw new Error("seed failed: movement");
  }

  return addMovement(groupId, userId, parsed.value);
}

function loanSchedule() {
  const generated = Schedule.generate({
    capital: 30000,
    ratePercent: 10,
    installmentCount: 4,
    frequency: "monthly",
    startDate: TODAY,
  });

  if (!generated.ok) {
    throw new Error("seed failed: schedule");
  }

  return generated.value;
}

async function repayMovementOf(groupId: string, loanId: string) {
  const detail = await getLoanDetail(groupId, loanId);

  const repayMovementId = detail.ok
    ? detail.value.installments[0].repayMovementId
    : null;

  if (!repayMovementId) {
    throw new Error("seed failed: repay movement");
  }

  return repayMovementId;
}

export async function seedTenants() {
  const ana = await user("clerk_ana", "Ana");
  const rosa = await user("clerk_rosa", "Rosa");
  const bea = await user("clerk_bea", "Bea");
  const beto = await user("clerk_beto", "Beto");
  const outsider = await user("clerk_outsider", "Outsider");

  const groupA = await group(ana, "A solo");
  const groupA2 = await group(ana, "A con Rosa");
  await joinGroup(rosa, groupA2.inviteCode.value);
  const groupB = await group(bea, "B victima");
  await joinGroup(beto, groupB.inviteCode.value);

  const movementA = await contribute(groupA.id, ana.id, "100");
  const movementA2 = await contribute(groupA2.id, ana.id, "100");
  const movementB = await contribute(groupB.id, bea.id, "1000");
  const pendingTargetB = await contribute(groupB.id, bea.id, "10");

  const karina = loanSchedule();
  const loan = await createLoan(groupB.id, bea.id, {
    borrower: { name: "Karina" },
    capital: karina.capital,
    rateBps: 1000,
    frequency: "monthly",
    startDate: TODAY,
    installments: karina.installments,
  });

  if (!loan.ok) {
    throw new Error("seed failed: loan");
  }

  const loanDetail = await getLoanDetail(groupB.id, loan.value.loanId);

  if (!loanDetail.ok) {
    throw new Error("seed failed: loan detail");
  }

  const [firstCuota, secondCuota] = loanDetail.value.installments;
  await collectInstallment(
    groupB.id,
    bea.id,
    loan.value.loanId,
    firstCuota.id,
    TODAY,
  );

  const sale = await createCreditSale(groupB.id, bea.id, {
    buyer: { name: "Juan" },
    item: "Licuadora",
    price: 10000,
    cost: 6000,
    downPayment: 2000,
    frequency: "monthly",
    startDate: TODAY,
    installments: [
      { dueDate: "2026-12-15", amount: 4000 },
      { dueDate: "2027-01-15", amount: 4000 },
    ],
  });

  if (!sale.ok) {
    throw new Error("seed failed: sale");
  }

  const saleDetail = await getCreditSale(groupB.id, sale.value.saleId);

  if (!saleDetail.ok) {
    throw new Error("seed failed: sale detail");
  }

  const pendingChange = await proposeMovementChange(
    groupB.id,
    bea.id,
    pendingTargetB.id,
    "void",
  );

  if (!pendingChange.ok) {
    throw new Error("seed failed: pending change");
  }

  const [contactB] = await listContacts(groupB.id);

  return {
    ana,
    rosa,
    bea,
    beto,
    outsider,
    groupA,
    groupA2,
    groupB,
    movementA,
    movementA2,
    b: {
      movement: movementB,
      pendingTarget: pendingTargetB,
      pendingId: pendingChange.value.pendingId,
      contactId: contactB.id,
      loanId: loan.value.loanId,
      lendMovementId: loanDetail.value.lendMovementId,
      collectedCuotaId: firstCuota.id,
      repayMovementId: await repayMovementOf(groupB.id, loan.value.loanId),
      pendingCuotaId: secondCuota.id,
      saleId: sale.value.saleId,
      saleMovementId: saleDetail.value.saleMovementId,
      salePendingCuotaId: saleDetail.value.installments[1].id,
      collectSaleMovementId: saleDetail.value.installments[0]
        .collectMovementId as string,
    },
  };
}

export type Tenants = Awaited<ReturnType<typeof seedTenants>>;

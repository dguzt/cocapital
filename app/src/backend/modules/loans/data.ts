/**
 * M4 data layer. Loan creation and collection are multi-table writes →
 * atomic db.batch with client-generated ids (neon-http: no interactive tx).
 * Golden rule (D2): lenders create Loans and register Collections;
 * installments are always system output, never hand-typed.
 */
import { and, asc, desc, eq } from "drizzle-orm";
import * as R from "remeda";
import type { Frequency, ISODate } from "@/lib/dates";
import type { Cents } from "@/lib/money";
import type { AppError } from "@/lib/result";
import { err, ok, type Result } from "@/lib/result";
import { db } from "../../infra/db/client";
import {
  borrowers,
  installments,
  loans,
  movements,
} from "../../infra/db/schema";

export type LoanError =
  | AppError<"BorrowerNameRequired">
  | AppError<"BorrowerNotFound", { borrowerId: string }>
  | AppError<"LoanNotFound", { loanId: string }>
  | AppError<"InvalidInstallments", { reason: string }>
  | AppError<"InstallmentNotCollectable", { installmentId: string }>;

export type NewLoanInstallment = {
  number: number;
  dueDate: ISODate;
  amount: Cents;
  principal: Cents;
  interest: Cents;
};

export type NewLoan = {
  borrower: { id: string } | { name: string; phone?: string };
  capital: Cents;
  rateBps: number;
  frequency: Frequency;
  startDate: ISODate;
  installments: NewLoanInstallment[];
};

export type LoanListItem = {
  id: string;
  borrowerName: string;
  capital: Cents;
  collectedCount: number;
  totalCount: number;
  overdueCount: number;
  pendingAmount: Cents;
};

export type LoanDetail = {
  id: string;
  borrowerName: string;
  capital: Cents;
  rateBps: number;
  frequency: Frequency;
  startDate: ISODate;
  expectedInterest: Cents;
  collectedAmount: Cents;
  pendingAmount: Cents;
  installments: {
    id: string;
    number: number;
    dueDate: ISODate;
    amount: Cents;
    principal: Cents;
    interest: Cents;
    status: "pending" | "collected";
  }[];
};

/** UC-301: reusable borrowers of the group, for select-or-create. */
export async function listBorrowers(groupId: string) {
  return db
    .select({ id: borrowers.id, name: borrowers.name })
    .from(borrowers)
    .where(eq(borrowers.groupId, groupId))
    .orderBy(asc(borrowers.name));
}

/**
 * UC-302: create borrower (if new) + loan + installments + the lend
 * movement — one atomic batch (D3 #5: principal only moves cash→Prestado).
 */
export async function createLoan(
  groupId: string,
  userId: string,
  input: NewLoan,
): Promise<Result<{ loanId: string }, LoanError>> {
  if (input.installments.length === 0) {
    return err({
      kind: "InvalidInstallments",
      message: "a loan needs at least one installment",
      reason: "empty",
    });
  }
  const sumPrincipal = R.sumBy(input.installments, (i) => i.principal);
  if (sumPrincipal !== input.capital) {
    return err({
      kind: "InvalidInstallments",
      message: `principal shares (${sumPrincipal}) must sum to capital (${input.capital})`,
      reason: "principal-mismatch",
    });
  }
  if (
    input.installments.some(
      (i) => i.amount <= 0 || i.principal + i.interest !== i.amount,
    )
  ) {
    return err({
      kind: "InvalidInstallments",
      message:
        "each installment needs amount > 0 and principal+interest=amount",
      reason: "row-invariant",
    });
  }

  const borrowerId =
    "id" in input.borrower ? input.borrower.id : crypto.randomUUID();
  if ("id" in input.borrower) {
    const [existing] = await db
      .select({ id: borrowers.id })
      .from(borrowers)
      .where(
        and(
          eq(borrowers.id, input.borrower.id),
          eq(borrowers.groupId, groupId),
        ),
      );
    if (!existing) {
      return err({
        kind: "BorrowerNotFound",
        message: "borrower does not exist in this group",
        borrowerId: input.borrower.id,
      });
    }
  } else if (!input.borrower.name.trim()) {
    return err({
      kind: "BorrowerNameRequired",
      message: "new borrower needs a name",
    });
  }

  const loanId = crypto.randomUUID();
  const lendMovementId = crypto.randomUUID();
  const newBorrower = "name" in input.borrower ? input.borrower : null;

  await db.batch([
    ...(newBorrower
      ? [
          db.insert(borrowers).values({
            id: borrowerId,
            groupId,
            name: newBorrower.name.trim(),
            phone: newBorrower.phone?.trim() || null,
          }),
        ]
      : []),
    db.insert(movements).values({
      id: lendMovementId,
      groupId,
      userId,
      type: "lend",
      amount: input.capital,
      concept: null,
      date: input.startDate,
    }),
    db.insert(loans).values({
      id: loanId,
      groupId,
      userId,
      borrowerId,
      capital: input.capital,
      rateBps: input.rateBps,
      installmentCount: input.installments.length,
      frequency: input.frequency,
      startDate: input.startDate,
      lendMovementId,
    }),
    db.insert(installments).values(
      input.installments.map((i) => ({
        loanId,
        number: i.number,
        dueDate: i.dueDate,
        amount: i.amount,
        principal: i.principal,
        interest: i.interest,
      })),
    ),
  ] as unknown as Parameters<typeof db.batch>[0]);

  return ok({ loanId });
}

/** UC-303: loans list with per-loan aggregates. */
export async function listLoans(
  groupId: string,
  today: ISODate,
): Promise<LoanListItem[]> {
  const rows = await db
    .select({
      id: loans.id,
      capital: loans.capital,
      borrowerName: borrowers.name,
      instStatus: installments.status,
      instAmount: installments.amount,
      instDue: installments.dueDate,
    })
    .from(loans)
    .innerJoin(borrowers, eq(borrowers.id, loans.borrowerId))
    .innerJoin(installments, eq(installments.loanId, loans.id))
    .where(eq(loans.groupId, groupId))
    .orderBy(desc(loans.createdAt));

  return R.pipe(
    rows,
    R.groupBy((r) => r.id),
    R.entries(),
    R.map(([id, group]) => {
      const pending = group.filter((r) => r.instStatus === "pending");
      return {
        id,
        borrowerName: group[0].borrowerName,
        capital: group[0].capital,
        collectedCount: group.length - pending.length,
        totalCount: group.length,
        overdueCount: pending.filter((r) => r.instDue < today).length,
        pendingAmount: R.sumBy(pending, (r) => r.instAmount),
      };
    }),
  );
}

/** All the group's installment terms — feeds M5's realized-only derivation. */
export async function listGroupInstallments(groupId: string) {
  return db
    .select({
      principal: installments.principal,
      interest: installments.interest,
      status: installments.status,
      dueDate: installments.dueDate,
    })
    .from(installments)
    .innerJoin(loans, eq(loans.id, installments.loanId))
    .where(eq(loans.groupId, groupId));
}

export async function getLoan(
  groupId: string,
  loanId: string,
): Promise<Result<LoanDetail, LoanError>> {
  const [loan] = await db
    .select({
      id: loans.id,
      capital: loans.capital,
      rateBps: loans.rateBps,
      frequency: loans.frequency,
      startDate: loans.startDate,
      borrowerName: borrowers.name,
    })
    .from(loans)
    .innerJoin(borrowers, eq(borrowers.id, loans.borrowerId))
    .where(and(eq(loans.id, loanId), eq(loans.groupId, groupId)));
  if (!loan) {
    return err({ kind: "LoanNotFound", message: "loan not found", loanId });
  }

  const rows = await db
    .select()
    .from(installments)
    .where(eq(installments.loanId, loanId))
    .orderBy(asc(installments.number));

  const [collected, pending] = R.partition(
    rows,
    (r) => r.status === "collected",
  );
  return ok({
    ...loan,
    expectedInterest: R.sumBy(rows, (r) => r.interest),
    collectedAmount: R.sumBy(collected, (r) => r.amount),
    pendingAmount: R.sumBy(pending, (r) => r.amount),
    installments: rows.map((r) => ({
      id: r.id,
      number: r.number,
      dueDate: r.dueDate,
      amount: r.amount,
      principal: r.principal,
      interest: r.interest,
      status: r.status,
    })),
  });
}

/**
 * UC-304: collect an installment — conditional flip + repay movement,
 * atomically. The WHERE status='pending' guard makes double-collect
 * impossible (verified pattern from the tx experiment).
 */
export async function collectInstallment(
  groupId: string,
  userId: string,
  loanId: string,
  installmentId: string,
  today: ISODate,
): Promise<Result<{ amount: Cents }, LoanError>> {
  const loan = await getLoan(groupId, loanId);
  if (!loan.ok) return loan;
  const inst = loan.value.installments.find((i) => i.id === installmentId);
  if (!inst || inst.status !== "pending") {
    return err({
      kind: "InstallmentNotCollectable",
      message: "installment missing or already collected",
      installmentId,
    });
  }

  const repayMovementId = crypto.randomUUID();
  // Order matters: the movement must exist before the installment's FK
  // points at it (batch statements run sequentially in one transaction).
  const [_movement, flipped] = await db.batch([
    db.insert(movements).values({
      id: repayMovementId,
      groupId,
      userId,
      type: "repay",
      amount: inst.amount,
      cost: inst.principal, // principal share → feed shows "Interés S/x"
      concept: `${loan.value.borrowerName} · cuota ${inst.number}`,
      date: today,
    }),
    db
      .update(installments)
      .set({
        status: "collected",
        collectedAt: new Date(),
        repayMovementId,
      })
      .where(
        and(
          eq(installments.id, installmentId),
          eq(installments.status, "pending"), // the double-collect guard
        ),
      )
      .returning({ id: installments.id }),
  ]);

  if (flipped.length === 0) {
    // Race: someone collected between read and write; the batch still ran,
    // so remove the orphan repay movement it inserted.
    await db.delete(movements).where(eq(movements.id, repayMovementId));
    return err({
      kind: "InstallmentNotCollectable",
      message: "installment was already collected",
      installmentId,
    });
  }
  return ok({ amount: inst.amount });
}

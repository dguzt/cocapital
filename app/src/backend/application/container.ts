/**
 * The composition root: the whole dependency graph of the backend, in one file.
 *
 * typed-inject checks it at COMPILE time — if a use case gains a dependency and
 * this file is not updated, it stops compiling. There are no string tokens the
 * compiler cannot see.
 *
 * ⚠️ The instances below are module-level singletons, shared across requests.
 * NEVER store request state (groupId, userId, actorId) on a use case or a
 * repository — it would leak between users. Request state always travels as an
 * argument to `execute()`.
 */
import { createInjector } from "typed-inject";

import { db } from "../infra/db/client";
import { UnitOfWork } from "../infra/db/write";
import { ClerkIdentityProvider } from "../modules/accounts/adapters/out/clerk/clerk-identity-provider";
import { DrizzleUserRepository } from "../modules/accounts/adapters/out/drizzle/drizzle-user-repository";
import { EnsureUser } from "../modules/accounts/usecases/ensure-user";
import { UndoPurchase } from "../modules/inventory/usecases/undo-purchase";
import { UndoSale } from "../modules/inventory/usecases/undo-sale";
import { BorrowerRepository } from "../modules/loans/repositories/borrower-repository";
import { InstallmentRepository } from "../modules/loans/repositories/installment-repository";
import { LoanRepository } from "../modules/loans/repositories/loan-repository";
import { CollectInstallment } from "../modules/loans/usecases/collect-installment";
import { CreateLoan } from "../modules/loans/usecases/create-loan";
import { GetLoanDetail } from "../modules/loans/usecases/get-loan-detail";
import { GetLoanTargetForMovement } from "../modules/loans/usecases/get-loan-target-for-movement";
import { ListBorrowers } from "../modules/loans/usecases/list-borrowers";
import { ListGroupInstallments } from "../modules/loans/usecases/list-group-installments";
import { ListLoans } from "../modules/loans/usecases/list-loans";
import { ProposeVoidLoan } from "../modules/loans/usecases/propose-void-loan";
import { UndoCollection } from "../modules/loans/usecases/undo-collection";
import { VoidLoan } from "../modules/loans/usecases/void-loan";
import { ChangeRepository } from "../modules/movements/repositories/change-repository";
import { MovementRepository } from "../modules/movements/repositories/movement-repository";
import { AddMovement } from "../modules/movements/usecases/add-movement";
import { DecideChange } from "../modules/movements/usecases/decide-change";
import { GetMovementHistory } from "../modules/movements/usecases/get-movement-history";
import { ListMovements } from "../modules/movements/usecases/list-movements";
import { ListPendingChanges } from "../modules/movements/usecases/list-pending-changes";
import { ProposeChange } from "../modules/movements/usecases/propose-change";
import { ProposeSystemVoid } from "../modules/movements/usecases/propose-system-void";
import { VoidEntry } from "../modules/movements/usecases/void-entry";
import { ApplyApprovedChange } from "./apply-approved-change";

/**
 * Infrastructure and repositories. Everything downstream is built from these,
 * so a test can swap the `db` for another Neon branch and the graph follows.
 */
const injector = createInjector()
  .provideValue("db", db)
  .provideClass("uow", UnitOfWork)

  .provideClass("users", DrizzleUserRepository)
  .provideClass("identity", ClerkIdentityProvider)

  .provideClass("movements", MovementRepository)
  .provideClass("changes", ChangeRepository)
  .provideClass("loans", LoanRepository)
  .provideClass("installments", InstallmentRepository)
  .provideClass("borrowers", BorrowerRepository)

  // The owners of each undo. `applier` is the ONLY thing that knows all of
  // them, and DecideChange only ever sees it through the ChangeApplier
  // interface — so the ledger still knows nothing about loans or inventory.
  .provideClass("voidEntry", VoidEntry)
  .provideClass("undoCollection", UndoCollection)
  .provideClass("undoSale", UndoSale)
  .provideClass("undoPurchase", UndoPurchase)
  .provideClass("voidLoan", VoidLoan)
  .provideClass("applier", ApplyApprovedChange)

  // Cancelling a loan is proposed from the loan but flows through the ledger's
  // approval inbox: ProposeVoidLoan maps the loan to its lend movement, then
  // ProposeSystemVoid opens the pending change on it.
  .provideClass("proposeSystemVoid", ProposeSystemVoid)

  // GetLoanDetail is a use case that another use case depends on: collecting a
  // cuota starts by reading the loan, with the same authorization.
  .provideClass("getLoanDetail", GetLoanDetail);

export const useCases = {
  ensureUser: injector.injectClass(EnsureUser),

  addMovement: injector.injectClass(AddMovement),
  proposeChange: injector.injectClass(ProposeChange),
  decideChange: injector.injectClass(DecideChange),
  listMovements: injector.injectClass(ListMovements),
  listPendingChanges: injector.injectClass(ListPendingChanges),
  getMovementHistory: injector.injectClass(GetMovementHistory),

  createLoan: injector.injectClass(CreateLoan),
  collectInstallment: injector.injectClass(CollectInstallment),
  proposeVoidLoan: injector.injectClass(ProposeVoidLoan),
  getLoanTargetForMovement: injector.injectClass(GetLoanTargetForMovement),
  getLoanDetail: injector.resolve("getLoanDetail"),
  listLoans: injector.injectClass(ListLoans),
  listBorrowers: injector.injectClass(ListBorrowers),
  listGroupInstallments: injector.injectClass(ListGroupInstallments),
} as const;

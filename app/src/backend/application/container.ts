import { createInjector } from "typed-inject";

import { db } from "@/backend/infra/db/client";
import { DrizzleUnitOfWork } from "@/backend/infra/db/drizzle-unit-of-work";
import { ClerkIdentityProvider } from "@/backend/modules/accounts/adapters/out/clerk/clerk-identity-provider";
import { DrizzleUserRepository } from "@/backend/modules/accounts/adapters/out/drizzle/drizzle-user-repository";
import { EnsureUser } from "@/backend/modules/accounts/usecases/ensure-user";
import { GetCapitalSummary } from "@/backend/modules/capital/usecases/get-capital-summary";
import { DrizzleContactRepository } from "@/backend/modules/contacts/adapters/out/drizzle/drizzle-contact-repository";
import { ListContacts } from "@/backend/modules/contacts/usecases/list-contacts";
import { ResolveContact } from "@/backend/modules/contacts/usecases/resolve-contact";
import { DrizzleGroupRepository } from "@/backend/modules/groups/adapters/out/drizzle/drizzle-group-repository";
import { CreateGroup } from "@/backend/modules/groups/usecases/create-group";
import { GetMyGroup } from "@/backend/modules/groups/usecases/get-my-group";
import { JoinGroup } from "@/backend/modules/groups/usecases/join-group";
import { DrizzleCreditSaleRepository } from "@/backend/modules/inventory/adapters/out/drizzle/drizzle-credit-sale-repository";
import { DrizzlePlanChangeRepository } from "@/backend/modules/inventory/adapters/out/drizzle/drizzle-plan-change-repository";
import { CollectSaleInstallment } from "@/backend/modules/inventory/usecases/collect-sale-installment";
import { CreateCreditSale } from "@/backend/modules/inventory/usecases/create-credit-sale";
import { GetCreditSale } from "@/backend/modules/inventory/usecases/get-credit-sale";
import { GetSaleTargetForMovement } from "@/backend/modules/inventory/usecases/get-sale-target-for-movement";
import { ListCreditSales } from "@/backend/modules/inventory/usecases/list-credit-sales";
import { ListPlanChanges } from "@/backend/modules/inventory/usecases/list-plan-changes";
import { ProposeVoidCreditSale } from "@/backend/modules/inventory/usecases/propose-void-credit-sale";
import { ReplanCreditSale } from "@/backend/modules/inventory/usecases/replan-credit-sale";
import { UndoPurchase } from "@/backend/modules/inventory/usecases/undo-purchase";
import { UndoSale } from "@/backend/modules/inventory/usecases/undo-sale";
import { UndoSaleCollection } from "@/backend/modules/inventory/usecases/undo-sale-collection";
import { VoidCreditSale } from "@/backend/modules/inventory/usecases/void-credit-sale";
import { DrizzleInstallmentRepository } from "@/backend/modules/loans/adapters/out/drizzle/drizzle-installment-repository";
import { DrizzleLoanRepository } from "@/backend/modules/loans/adapters/out/drizzle/drizzle-loan-repository";
import { CollectInstallment } from "@/backend/modules/loans/usecases/collect-installment";
import { CreateLoan } from "@/backend/modules/loans/usecases/create-loan";
import { GetLoanDetail } from "@/backend/modules/loans/usecases/get-loan-detail";
import { GetLoanTargetForMovement } from "@/backend/modules/loans/usecases/get-loan-target-for-movement";
import { ListGroupInstallments } from "@/backend/modules/loans/usecases/list-group-installments";
import { ListLoans } from "@/backend/modules/loans/usecases/list-loans";
import { ProposeVoidLoan } from "@/backend/modules/loans/usecases/propose-void-loan";
import { UndoCollection } from "@/backend/modules/loans/usecases/undo-collection";
import { VoidLoan } from "@/backend/modules/loans/usecases/void-loan";
import { DrizzleChangeRepository } from "@/backend/modules/movements/adapters/out/drizzle/drizzle-change-repository";
import { DrizzleMovementRepository } from "@/backend/modules/movements/adapters/out/drizzle/drizzle-movement-repository";
import { AddMovement } from "@/backend/modules/movements/usecases/add-movement";
import { DecideChange } from "@/backend/modules/movements/usecases/decide-change";
import { EditEntry } from "@/backend/modules/movements/usecases/edit-entry";
import { GetMovementHistory } from "@/backend/modules/movements/usecases/get-movement-history";
import { ListMovements } from "@/backend/modules/movements/usecases/list-movements";
import { ListPendingChanges } from "@/backend/modules/movements/usecases/list-pending-changes";
import { ProposeChange } from "@/backend/modules/movements/usecases/propose-change";
import { ProposeSystemVoid } from "@/backend/modules/movements/usecases/propose-system-void";
import { VoidEntry } from "@/backend/modules/movements/usecases/void-entry";
import { ApplyApprovedChange } from "./apply-approved-change";

/**
 * The whole dependency graph of the backend. Every instance is a singleton
 * shared by all requests, so request data always travels as an argument to
 * `execute()`.
 */
const injector = createInjector()
  .provideValue("db", db)
  .provideClass("uow", DrizzleUnitOfWork)

  .provideClass("users", DrizzleUserRepository)
  .provideClass("identity", ClerkIdentityProvider)
  .provideClass("groups", DrizzleGroupRepository)
  .provideClass("movements", DrizzleMovementRepository)
  .provideClass("changes", DrizzleChangeRepository)
  .provideClass("loans", DrizzleLoanRepository)
  .provideClass("installments", DrizzleInstallmentRepository)
  .provideClass("contacts", DrizzleContactRepository)
  .provideClass("creditSales", DrizzleCreditSaleRepository)
  .provideClass("planChanges", DrizzlePlanChangeRepository)

  .provideClass("resolveContact", ResolveContact)
  .provideClass("addMovement", AddMovement)
  .provideClass("voidEntry", VoidEntry)
  .provideClass("editEntry", EditEntry)
  .provideClass("proposeSystemVoid", ProposeSystemVoid)
  .provideClass("getLoanDetail", GetLoanDetail)
  .provideClass("listMovements", ListMovements)
  .provideClass("listGroupInstallments", ListGroupInstallments)
  .provideClass("collectSaleInstallment", CollectSaleInstallment)

  .provideClass("undoCollection", UndoCollection)
  .provideClass("undoSale", UndoSale)
  .provideClass("undoPurchase", UndoPurchase)
  .provideClass("voidLoan", VoidLoan)
  .provideClass("undoSaleCollection", UndoSaleCollection)
  .provideClass("voidCreditSale", VoidCreditSale)
  .provideClass("applier", ApplyApprovedChange);

export const useCases = {
  ensureUser: injector.injectClass(EnsureUser),

  getMyGroup: injector.injectClass(GetMyGroup),
  createGroup: injector.injectClass(CreateGroup),
  joinGroup: injector.injectClass(JoinGroup),

  addMovement: injector.resolve("addMovement"),
  proposeChange: injector.injectClass(ProposeChange),
  decideChange: injector.injectClass(DecideChange),
  listMovements: injector.resolve("listMovements"),
  listPendingChanges: injector.injectClass(ListPendingChanges),
  getMovementHistory: injector.injectClass(GetMovementHistory),

  createLoan: injector.injectClass(CreateLoan),
  collectInstallment: injector.injectClass(CollectInstallment),
  proposeVoidLoan: injector.injectClass(ProposeVoidLoan),
  getLoanTargetForMovement: injector.injectClass(GetLoanTargetForMovement),
  getLoanDetail: injector.resolve("getLoanDetail"),
  listLoans: injector.injectClass(ListLoans),
  listGroupInstallments: injector.resolve("listGroupInstallments"),

  listContacts: injector.injectClass(ListContacts),

  createCreditSale: injector.injectClass(CreateCreditSale),
  collectSaleInstallment: injector.resolve("collectSaleInstallment"),
  replanCreditSale: injector.injectClass(ReplanCreditSale),
  proposeVoidCreditSale: injector.injectClass(ProposeVoidCreditSale),
  getCreditSale: injector.injectClass(GetCreditSale),
  listCreditSales: injector.injectClass(ListCreditSales),
  listPlanChanges: injector.injectClass(ListPlanChanges),
  getSaleTargetForMovement: injector.injectClass(GetSaleTargetForMovement),

  getCapitalSummary: injector.injectClass(GetCapitalSummary),
} as const;

/**
 * The real container, adapted to the call shape the tests already had.
 *
 * The tests are the proof that this refactor changed nothing, so their
 * assertions must not move. These adapters are therefore the entire visible
 * difference between the old API and the new one: same behaviour, now reached
 * through `useCases.<name>.execute({ ... })` with a named input object.
 *
 * They run against the REAL graph (real repositories, real Neon test branch) —
 * nothing is faked here. To fake a repository, build your own injector with
 * `.provideValue("loans", fake)` instead of importing this.
 */
import { useCases } from "@/backend/application/container";
import type { NewLoan } from "@/backend/modules/loans/domain/loan";
import type { MovementSnapshot } from "@/backend/modules/movements/domain/movement";
import type { ChangeKind } from "@/backend/modules/movements/domain/pending";
import type { NewMovement } from "@/backend/modules/movements/domain/validate";
import type { ISODate } from "@/lib/dates";

export const addMovement = (
  groupId: string,
  userId: string,
  input: NewMovement,
) => useCases.addMovement.execute({ ...input, groupId, userId });

export const listMovements = (groupId: string) =>
  useCases.listMovements.execute({ groupId });

export const listPendingChanges = (groupId: string) =>
  useCases.listPendingChanges.execute({ groupId });

export const listMovementHistory = (groupId: string, movementId: string) =>
  useCases.getMovementHistory.execute({ groupId, movementId });

export const proposeMovementChange = (
  groupId: string,
  actorId: string,
  movementId: string,
  kind: ChangeKind,
  after?: MovementSnapshot,
) =>
  useCases.proposeChange.execute({
    groupId,
    actorId,
    movementId,
    kind,
    after,
  });

export const decideMovementChange = (
  groupId: string,
  actorId: string,
  pendingId: string,
  decision: "approve" | "reject",
) => useCases.decideChange.execute({ groupId, actorId, pendingId, decision });

export const createLoan = (groupId: string, userId: string, input: NewLoan) =>
  useCases.createLoan.execute({ ...input, groupId, userId });

export const collectInstallment = (
  groupId: string,
  userId: string,
  loanId: string,
  installmentId: string,
  today: ISODate,
) =>
  useCases.collectInstallment.execute({
    groupId,
    userId,
    loanId,
    installmentId,
    today,
  });

export const proposeVoidLoan = (
  groupId: string,
  actorId: string,
  loanId: string,
) => useCases.proposeVoidLoan.execute({ groupId, actorId, loanId });

export const getLoanDetail = (groupId: string, loanId: string) =>
  useCases.getLoanDetail.execute({ groupId, loanId });

export const listLoans = (groupId: string, today: ISODate) =>
  useCases.listLoans.execute({ groupId, today });

export const listBorrowers = (groupId: string) =>
  useCases.listBorrowers.execute({ groupId });

export const listGroupInstallments = (groupId: string) =>
  useCases.listGroupInstallments.execute({ groupId });

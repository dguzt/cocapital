/** The real use cases, called with the positional arguments the integration tests use. */
import { useCases } from "@/backend/application/container";
import type { NewLoan } from "@/backend/modules/loans/domain/new-loan";
import type { ChangeKind } from "@/backend/modules/movements/domain/change-kind";
import type {
  MovementSnapshot,
  MovementType,
} from "@/backend/modules/movements/domain/movement";
import type { NewMovement } from "@/backend/modules/movements/domain/new-movement";
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

export const getLoanTargetForMovement = (
  groupId: string,
  movementId: string,
  movementType: MovementType,
) =>
  useCases.getLoanTargetForMovement.execute({
    groupId,
    movementId,
    movementType,
  });

export const getLoanDetail = (groupId: string, loanId: string) =>
  useCases.getLoanDetail.execute({ groupId, loanId });

export const listLoans = (groupId: string, today: ISODate) =>
  useCases.listLoans.execute({ groupId, today });

export const listContacts = (groupId: string) =>
  useCases.listContacts.execute({ groupId });

export const listGroupInstallments = (groupId: string) =>
  useCases.listGroupInstallments.execute({ groupId });

type SeededUser = { id: string; name: string };

export const createGroup = (creator: SeededUser, name: string) =>
  useCases.createGroup.execute({
    creator: { userId: creator.id, name: creator.name },
    name,
  });

export const joinGroup = (partner: SeededUser, code: string) =>
  useCases.joinGroup.execute({
    partner: { userId: partner.id, name: partner.name },
    code,
  });

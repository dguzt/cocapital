"use server";
/** M3's edge with Next: session → use case → revalidate. No rules here. */
import { revalidatePath } from "next/cache";
import { useCases } from "@/backend/application/container";
import { requireUser } from "@/backend/modules/accounts/adapters/in/next/session";
import { findGroupOf } from "@/backend/modules/groups/data";
import { todayInLima } from "@/lib/dates";
import { solesToCents } from "@/lib/money";
import type { MovementSnapshot } from "./domain/movement";
import { validateNewMovement } from "./domain/validate";

export type AddMovementInput = {
  type: string;
  amountSoles: string;
  costSoles?: string;
  concept?: string;
};

/** A void on a `repay` flips its cuota back to pending — refresh loans too. */
function revalidateLedgerAndLoans() {
  revalidatePath("/");
  revalidatePath("/actividad");
  revalidatePath("/prestamos");
  revalidatePath("/prestamos/[id]", "page");
}

export async function addMovementAction(input: AddMovementInput) {
  const user = await requireUser();
  const group = await findGroupOf(user.id);

  if (!group) {
    return { ok: false as const, error: "NoGroup" };
  }

  const validated = validateNewMovement({ ...input, today: todayInLima() });

  if (!validated.ok) {
    return { ok: false as const, error: validated.error.kind };
  }

  await useCases.addMovement.execute({
    ...validated.value,
    groupId: group.id,
    userId: user.id,
  });

  revalidatePath("/");

  return { ok: true as const };
}

/** UC-401: propose an edit (amount / concept / cost). Goes pending. */
export async function proposeEditAction(
  movementId: string,
  input: { amountSoles: string; concept: string; costSoles?: string },
  before: MovementSnapshot,
) {
  const user = await requireUser();
  const group = await findGroupOf(user.id);

  if (!group) {
    return { ok: false as const, error: "NoGroup" };
  }

  const amount = solesToCents(input.amountSoles);

  if (amount === null || amount <= 0) {
    return { ok: false as const, error: "InvalidAmount" };
  }

  const cost = input.costSoles?.trim() ? solesToCents(input.costSoles) : null;

  if (input.costSoles?.trim() && (cost === null || cost <= 0)) {
    return { ok: false as const, error: "InvalidCost" };
  }

  const after: MovementSnapshot = {
    ...before,
    amount,
    concept: input.concept.trim() || null,
    cost: before.type === "sell_inventory" ? cost : before.cost,
  };

  const result = await useCases.proposeChange.execute({
    groupId: group.id,
    actorId: user.id,
    movementId,
    kind: "edit",
    after,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidatePath("/");
  revalidatePath("/actividad");

  return { ok: true as const };
}

/**
 * UC-402: propose a void — never a delete. Goes pending.
 * On a `repay` this is "deshacer cobro": approving it returns the cuota to
 * pending, so the loan pages must be revalidated too.
 */
export async function proposeVoidAction(movementId: string) {
  const user = await requireUser();
  const group = await findGroupOf(user.id);

  if (!group) {
    return { ok: false as const, error: "NoGroup" };
  }

  const result = await useCases.proposeChange.execute({
    groupId: group.id,
    actorId: user.id,
    movementId,
    kind: "void",
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidateLedgerAndLoans();

  return { ok: true as const };
}

/** UC-403: the other partner approves or rejects. */
export async function decideChangeAction(
  pendingId: string,
  decision: "approve" | "reject",
) {
  const user = await requireUser();
  const group = await findGroupOf(user.id);

  if (!group) {
    return { ok: false as const, error: "NoGroup" };
  }

  const result = await useCases.decideChange.execute({
    groupId: group.id,
    actorId: user.id,
    pendingId,
    decision,
  });

  if (!result.ok) {
    return { ok: false as const, error: result.error.kind };
  }

  revalidateLedgerAndLoans();

  return { ok: true as const, applied: result.value.applied };
}

/** UC-404: immutable history of one movement, for the detail dialog. */
export async function getMovementHistoryAction(movementId: string) {
  const user = await requireUser();
  const group = await findGroupOf(user.id);

  if (!group) {
    return { ok: false as const, error: "NoGroup" };
  }

  const history = await useCases.getMovementHistory.execute({
    groupId: group.id,
    movementId,
  });

  return { ok: true as const, history };
}

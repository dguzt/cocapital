"use client";
/**
 * Movement detail (E4). This file orchestrates; the rules of what you may do
 * to each type live in actions-by-type.ts, next to their reason.
 */
import { ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { getSaleTargetForMovementAction } from "@/backend/modules/inventory/adapters/in/next/credit-sale-actions";
import { getLoanTargetForMovementAction } from "@/backend/modules/loans/adapters/in/next/loan-actions";
import {
  getMovementHistoryAction,
  proposeEditAction,
  proposeVoidAction,
} from "@/backend/modules/movements/adapters/in/next/movement-actions";
import type { ChangeHistoryItem } from "@/backend/modules/movements/domain/change-history-item";
import type { LedgerMovement } from "@/backend/modules/movements/domain/ledger-movement";
import { useGroup } from "@/components/groups/group-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDictionary } from "@/i18n/i18n-provider";
import { groupPath } from "@/lib/group-path";
import { formatCents } from "@/lib/money";
import { allowedActions } from "./actions-by-type";
import { ChangeHistory } from "./change-history";
import { type EditDraft, EditForm } from "./edit-form";

const emptyDraft: EditDraft = { amount: "", concept: "", cost: "" };

type Owner = "loan" | "sale" | null;

const OWNER_OF: Partial<Record<LedgerMovement["type"], Owner>> = {
  lend: "loan",
  repay: "loan",
  sell_on_credit: "sale",
  collect_sale: "sale",
};

/** The page a ledger row of a loan or a credit sale links to, at its cuota. */
async function ownerHref(
  groupId: string,
  owner: "loan" | "sale",
  movement: LedgerMovement,
): Promise<string | null> {
  if (owner === "loan") {
    const { target } = await getLoanTargetForMovementAction(
      groupId,
      movement.id,
      movement.type,
    );

    if (!target) {
      return null;
    }

    return target.installmentId
      ? groupPath(
          groupId,
          `/prestamos/${target.loanId}?cuota=${target.installmentId}`,
        )
      : groupPath(groupId, `/prestamos/${target.loanId}`);
  }

  const { target } = await getSaleTargetForMovementAction(
    groupId,
    movement.id,
    movement.type,
  );

  return target ? groupPath(groupId, `/ventas/${target.saleId}`) : null;
}

export function MovementDialog({
  movement,
  hasPending,
  children,
}: {
  movement: LedgerMovement;
  hasPending: boolean;
  children: React.ReactNode;
}) {
  const { groupId, alone } = useGroup();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draft, setDraft] = useState<EditDraft>(emptyDraft);
  const [history, setHistory] = useState<ChangeHistoryItem[] | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const copy = useDictionary();
  const t = copy.movementDialog;
  const label = copy.movementTypes[movement.type].label;
  const { canEdit, canVoid, note } = allowedActions(
    movement.type,
    movement.status,
    hasPending,
  );
  const owner = OWNER_OF[movement.type] ?? null;

  useEffect(() => {
    if (open) {
      setMode("view");
      setDraft({
        amount: (movement.amount / 100).toFixed(2),
        concept: movement.concept ?? "",
        cost: movement.cost !== null ? (movement.cost / 100).toFixed(2) : "",
      });
      setHistory(null);
      getMovementHistoryAction(groupId, movement.id).then((r) => {
        if (r.ok) setHistory(r.history);
      });
      setTarget(null);
      if (owner) {
        ownerHref(groupId, owner, movement).then(setTarget);
      }
    }
  }, [open, movement, owner, groupId]);

  function submitEdit() {
    startTransition(async () => {
      const result = await proposeEditAction(
        groupId,
        movement.id,
        {
          amountSoles: draft.amount,
          concept: draft.concept,
          costSoles: draft.cost || undefined,
        },
        {
          type: movement.type,
          amount: movement.amount,
          cost: movement.cost,
          concept: movement.concept,
          date: movement.date,
        },
      );
      if (result.ok) {
        setOpen(false);
        toast.success(result.applied ? t.changeApplied : t.changeSent);
        router.refresh();
      } else {
        toast.error(t.errors[result.error] ?? t.genericError);
      }
    });
  }

  function submitVoid() {
    startTransition(async () => {
      const result = await proposeVoidAction(groupId, movement.id);
      if (result.ok) {
        setOpen(false);
        toast.success(result.applied ? t.voided : t.voidSent);
        router.refresh();
      } else {
        toast.error(t.errors[result.error] ?? t.genericError);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {label}
            {movement.concept ? ` · ${movement.concept}` : ""}
          </DialogTitle>
          <DialogDescription>
            {movement.authorName} ·{" "}
            <span className="font-mono tabular-nums">
              {formatCents(movement.amount)}
            </span>
            {movement.status === "voided" && t.voidedSuffix}
          </DialogDescription>
        </DialogHeader>

        {hasPending && (
          <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[13px] text-amber-400">
            {t.pendingNotice}
          </p>
        )}

        {mode === "edit" ? (
          <EditForm
            alone={alone}
            movement={movement}
            draft={draft}
            pending={pending}
            onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
            onCancel={() => setMode("view")}
            onSubmit={submitEdit}
          />
        ) : owner ? (
          <div className="rounded-lg border border-border bg-secondary/50 px-3 py-3">
            <p className="text-[13px] text-muted-foreground">
              {movement.type === "repay" || movement.type === "collect_sale"
                ? t.owner[owner].collection
                : t.owner[owner].entry}
            </p>
            <Button
              className="mt-2.5 w-full"
              disabled={!target}
              asChild={!!target}
              onClick={() => setOpen(false)}
            >
              {target ? (
                <Link href={target}>
                  <ArrowRight className="size-4" /> {t.owner[owner].button}
                </Link>
              ) : (
                <>
                  <Loader2 className="size-4 animate-spin" />{" "}
                  {t.owner[owner].button}
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="secondary"
              disabled={!canEdit}
              onClick={() => setMode("edit")}
            >
              {t.edit}
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              disabled={!canVoid || pending}
              onClick={submitVoid}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {t.void}
            </Button>
          </div>
        )}

        {mode === "view" && !owner && alone && (canEdit || canVoid) && (
          <p className="text-[12px] text-muted-foreground">{t.aloneNote}</p>
        )}

        {mode === "view" && !owner && note && (
          <p className="text-[12px] text-muted-foreground">{note}</p>
        )}

        <ChangeHistory history={history} />
      </DialogContent>
    </Dialog>
  );
}

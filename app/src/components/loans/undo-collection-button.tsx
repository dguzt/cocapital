"use client";
/** Deshacer cobro (UC-402) — proposed from the cuota, applied on another partner's OK. */
import { Ban, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { proposeVoidAction } from "@/backend/modules/movements/adapters/in/next/movement-actions";
import { useGroup } from "@/components/groups/group-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDictionary } from "@/i18n/i18n-provider";
import { formatCents } from "@/lib/money";

export function UndoCollectionButton({
  repayMovementId,
  number,
  amountCents,
  borrowerName,
}: {
  repayMovementId: string;
  number: number;
  amountCents: number;
  borrowerName: string;
}) {
  const { groupId, alone } = useGroup();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const copy = useDictionary();
  const t = copy.undoCollection;

  function undo() {
    startTransition(async () => {
      const result = await proposeVoidAction(groupId, repayMovementId);
      if (result.ok) {
        setOpen(false);
        toast.success(result.applied ? t.undone : t.sent);
        router.refresh();
      } else {
        toast.error(
          result.error === "ChangeAlreadyPending" ? t.alreadyPending : t.failed,
        );
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-destructive">
          {t.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>
            {borrowerName} · {copy.common.installment(number)} ·{" "}
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatCents(amountCents)}
            </span>
            {t.backToPending}
          </DialogDescription>
        </DialogHeader>
        <p className="text-center text-[11.5px] text-muted-foreground">
          {alone ? copy.common.aloneNote : copy.common.partnerNote}
        </p>
        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {copy.common.cancel}
          </Button>
          <Button onClick={undo} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Ban className="size-4" />
            )}
            {pending
              ? copy.common.sending
              : alone
                ? copy.common.voidNow
                : copy.common.sendVoid}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

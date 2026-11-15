"use client";
import { Ban, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { proposeVoidCreditSaleAction } from "@/backend/modules/inventory/adapters/in/next/credit-sale-actions";
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

/** Proposes cancelling a whole credit sale and its cobros (doble confirmación). */
export function VoidCreditSaleButton({
  saleId,
  buyerName,
  item,
  collectedCount,
  collectedCents,
  className,
  label,
}: {
  saleId: string;
  buyerName: string;
  item: string;
  collectedCount: number;
  collectedCents: number;
  className?: string;
  label?: string;
}) {
  const { groupId, alone } = useGroup();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const copy = useDictionary();
  const t = copy.voidSale;

  function propose() {
    startTransition(async () => {
      const result = await proposeVoidCreditSaleAction(groupId, saleId);
      if (result.ok) {
        setOpen(false);
        toast.success(result.applied ? t.voided : t.sent);
        router.refresh();
      } else {
        toast.error(
          result.error === "CreditSaleVoided"
            ? t.alreadyVoided
            : result.error === "ChangeAlreadyPending"
              ? t.alreadyPending
              : t.failed,
        );
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={`text-destructive ${className ?? ""}`}
        >
          <Ban className="size-4" /> {label ?? t.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>
            {t.bodyStart(buyerName, item)}
            {collectedCount > 0 && (
              <>
                {t.collectedPart(collectedCount)}{" "}
                <span className="font-mono font-semibold text-foreground tabular-nums">
                  {formatCents(collectedCents)}
                </span>
              </>
            )}
            .
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
          <Button onClick={propose} disabled={pending}>
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

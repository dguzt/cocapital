"use client";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { collectSaleInstallmentAction } from "@/backend/modules/inventory/adapters/in/next/credit-sale-actions";
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

/** Cobrar one cuota of a credit sale, confirmed in a dialog. */
export function CollectSaleButton({
  saleId,
  installmentId,
  label,
  amountCents,
  buyerName,
}: {
  saleId: string;
  installmentId: string;
  label: string;
  amountCents: number;
  buyerName: string;
}) {
  const { groupId } = useGroup();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const copy = useDictionary();
  const t = copy.collect;

  function collect() {
    startTransition(async () => {
      const result = await collectSaleInstallmentAction(
        groupId,
        saleId,
        installmentId,
      );
      if (result.ok) {
        setOpen(false);
        toast.success(t.recorded(formatCents(result.amount)));
        router.refresh();
      } else {
        toast.error(
          result.error === "InstallmentNotCollectable"
            ? t.alreadyCollected
            : t.failed,
        );
        router.refresh();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t.button}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>
            {buyerName} · {label} ·{" "}
            <span className="font-mono font-semibold text-foreground tabular-nums">
              {formatCents(amountCents)}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {copy.common.cancel}
          </Button>
          <Button onClick={collect} disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Check className="size-4" />
            )}
            {pending ? t.recording : t.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

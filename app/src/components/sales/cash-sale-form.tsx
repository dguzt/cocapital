"use client";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { addMovementAction } from "@/backend/modules/movements/adapters/in/next/movement-actions";
import { useGroup } from "@/components/groups/group-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDictionary } from "@/i18n/i18n-provider";
import { sanitizeMoneyInput } from "@/lib/money";

/** A sale paid in full now: cash in, cost out of inventory. */
export function CashSaleForm() {
  const { groupId, href } = useGroup();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [item, setItem] = useState("");
  const t = useDictionary().cashSale;

  function save() {
    startTransition(async () => {
      const result = await addMovementAction(groupId, {
        type: "sell_inventory",
        amountSoles: price,
        costSoles: cost,
        concept: item,
      });

      if (result.ok) {
        toast.success(t.saved);
        router.push(href());
      } else {
        toast.error(t.errors[result.error] ?? t.genericError);
      }
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cash-price">{t.price}</Label>
          <Input
            id="cash-price"
            inputMode="decimal"
            placeholder="210.00"
            value={price}
            onChange={(e) => setPrice(sanitizeMoneyInput(e.target.value))}
            className="h-12 font-mono text-lg tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cash-cost">{t.cost}</Label>
          <Input
            id="cash-cost"
            inputMode="decimal"
            placeholder="0.00"
            value={cost}
            onChange={(e) => setCost(sanitizeMoneyInput(e.target.value))}
            className="h-12 font-mono text-lg tabular-nums"
          />
        </div>
      </div>
      <p className="-mt-3 text-[11px] text-muted-foreground">{t.costHint}</p>
      <div className="space-y-2">
        <Label htmlFor="cash-item">{t.item}</Label>
        <Input
          id="cash-item"
          maxLength={80}
          placeholder={t.itemPlaceholder}
          value={item}
          onChange={(e) => setItem(e.target.value)}
          className="h-12 text-base"
        />
      </div>
      <Button
        className="h-13 w-full text-base"
        disabled={pending || !price.trim()}
        onClick={save}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {pending ? t.recording : t.save}
      </Button>
    </div>
  );
}

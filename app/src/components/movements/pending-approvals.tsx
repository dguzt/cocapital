"use client";
/** UC-403: changes waiting for MY approval — inline Aprobar/Rechazar. */
import { Check, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { decideChangeAction } from "@/backend/modules/movements/adapters/in/next/movement-actions";
import type { PendingChangeItem } from "@/backend/modules/movements/domain/pending-change-item";
import { useGroup } from "@/components/groups/group-context";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/i18n-provider";
import { formatCents } from "@/lib/money";

export function PendingApprovals({ items }: { items: PendingChangeItem[] }) {
  const { groupId } = useGroup();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actingOn, setActingOn] = useState<string | null>(null);
  const copy = useDictionary();
  const t = copy.approvals;

  if (items.length === 0) return null;

  function decide(id: string, decision: "approve" | "reject") {
    setActingOn(id);
    startTransition(async () => {
      const result = await decideChangeAction(groupId, id, decision);
      if (result.ok) {
        toast.success(decision === "approve" ? t.approved : t.rejected);
        router.refresh();
      } else {
        toast.error(t.decideError);
        router.refresh();
      }
      setActingOn(null);
    });
  }

  return (
    <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
      <p className="text-sm font-semibold">
        {t.header(
          [...new Set(items.map((item) => item.proposerName))],
          items.length,
        )}
      </p>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => {
          const label = copy.movementTypes[item.before.type].label;
          const acting = actingOn === item.id;
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <span className="min-w-0 flex-1 text-[13.5px]">
                <span className="font-semibold">{item.proposerName}</span>{" "}
                {item.kind === "void" && item.before.type === "repay" ? (
                  <>
                    {t.wants}{" "}
                    <span className="text-destructive">{t.undoCollection}</span>
                    {item.before.concept
                      ? t.ofConcept(item.before.concept)
                      : ""}{" "}
                    {t.amountOf}{" "}
                    <span className="font-mono tabular-nums">
                      {formatCents(item.before.amount)}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {t.backToPending}
                    </span>
                  </>
                ) : item.kind === "void" && item.before.type === "lend" ? (
                  <>
                    {t.wants}{" "}
                    <span className="text-destructive">{t.voidLoan}</span>{" "}
                    {t.amountOf}{" "}
                    <span className="font-mono tabular-nums">
                      {formatCents(item.before.amount)}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {t.loanReversed}
                    </span>
                  </>
                ) : item.kind === "void" ? (
                  <>
                    {t.wants} <span className="text-destructive">{t.void}</span>{" "}
                    {label}
                    {item.before.concept ? ` · ${item.before.concept}` : ""}{" "}
                    {t.amountOf}{" "}
                    <span className="font-mono tabular-nums">
                      {formatCents(item.before.amount)}
                    </span>
                  </>
                ) : (
                  <>
                    {t.wantsChange} {label}
                    {item.before.concept ? ` · ${item.before.concept}` : ""}:{" "}
                    <span className="font-mono tabular-nums">
                      {formatCents(item.before.amount)}
                    </span>
                    {" → "}
                    <span className="font-mono font-semibold tabular-nums">
                      {item.after ? formatCents(item.after.amount) : "—"}
                    </span>
                  </>
                )}
              </span>
              <span className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => decide(item.id, "reject")}
                >
                  {acting && pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <X className="size-4" />
                  )}
                  {t.reject}
                </Button>
                <Button
                  size="sm"
                  disabled={pending}
                  onClick={() => decide(item.id, "approve")}
                >
                  {acting && pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  {t.approve}
                </Button>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

"use client";
/** UC-404 · Every proposal ever made on this movement, decided or not. */
import type { ChangeHistoryItem } from "@/backend/modules/movements/domain/change-history-item";
import { useDictionary } from "@/i18n/i18n-provider";
import { formatCents } from "@/lib/money";

const STATUS_CLS = {
  approved: "text-emerald-400",
  rejected: "text-destructive",
  pending: "text-amber-400",
} as const;

export function ChangeHistory({
  history,
}: {
  history: ChangeHistoryItem[] | null;
}) {
  const t = useDictionary().history;

  return (
    <div className="border-t border-border pt-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {t.title}
      </p>
      {history === null ? (
        <p className="mt-2 text-[13px] text-muted-foreground">{t.loading}</p>
      ) : history.length === 0 ? (
        <p className="mt-2 text-[13px] text-muted-foreground">{t.none}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {history.map((h) => (
            <li key={h.id} className="text-[13px]">
              <span className="font-medium">{h.proposerName}</span>{" "}
              {h.kind === "void" ? (
                t.proposedVoid
              ) : (
                <>
                  {t.changed}{" "}
                  <span className="font-mono tabular-nums">
                    {formatCents(h.before.amount)}
                  </span>
                  {" → "}
                  <span className="font-mono tabular-nums">
                    {h.after ? formatCents(h.after.amount) : "—"}
                  </span>
                </>
              )}{" "}
              <span className={STATUS_CLS[h.status]}>
                ·{" "}
                {h.status === "pending"
                  ? t.waiting
                  : h.status === "approved"
                    ? t.approvedBy(h.deciderName ?? "")
                    : t.rejectedBy(h.deciderName ?? "")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

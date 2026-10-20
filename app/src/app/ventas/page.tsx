import { Plus } from "lucide-react";
import Link from "next/link";
import { useCases } from "@/backend/application/container";
import { toUserView } from "@/backend/modules/accounts/adapters/in/next/user-view";
import { toGroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";
import { toCreditSaleView } from "@/backend/modules/inventory/adapters/in/next/credit-sale-view";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { isOverdue, todayInLima } from "@/lib/dates";
import { formatCents } from "@/lib/money";

export default async function SalesPage() {
  const { user, group } = await requireMembership();
  const today = todayInLima();
  const [sales, installments] = await Promise.all([
    useCases.listCreditSales.execute({ groupId: group.id }),
    useCases.listGroupInstallments.execute({ groupId: group.id }),
  ]);
  const overdueCount = installments.filter(
    (i) => i.status === "pending" && isOverdue(i.dueDate, today),
  ).length;
  const views = sales.map((sale) => toCreditSaleView(sale, today));

  return (
    <AppShell
      user={toUserView(user)}
      group={toGroupView(group)}
      active="sales"
      overdueCount={overdueCount}
      title="Ventas en cuotas"
      subtitle="Lo que te deben por ventas"
      actions={
        <Button asChild>
          <Link href="/ventas/nueva">
            <Plus className="size-4" /> Nueva venta
          </Link>
        </Button>
      }
    >
      {views.length === 0 ? (
        <section className="flex max-w-2xl flex-col items-center rounded-2xl border border-dashed border-input p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-2xl text-emerald-400">
            →
          </div>
          <p className="mt-4 font-medium">Aún no hay ventas en cuotas</p>
          <p className="mt-1 max-w-xs text-muted-foreground text-sm">
            Registra la primera: las cuotas se calculan solas.
          </p>
          <Button asChild className="mt-4">
            <Link href="/ventas/nueva">Vender en cuotas</Link>
          </Button>
        </section>
      ) : (
        <ul className="max-w-2xl space-y-2.5">
          {views.map((sale) => {
            const voided = sale.status === "voided";
            return (
              <li key={sale.id}>
                <Link
                  href={`/ventas/${sale.id}`}
                  className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-input ${voided || sale.settled ? "opacity-60" : ""}`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary font-bold">
                    {sale.buyerName[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[15px] font-bold ${voided ? "line-through" : ""}`}
                    >
                      {sale.buyerName}
                    </span>
                    <span className="block truncate text-[12.5px] text-zinc-500">
                      {sale.item} · {sale.collectedCount}/{sale.totalCount}{" "}
                      cobradas
                    </span>
                  </span>
                  {voided ? (
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      Anulada
                    </span>
                  ) : sale.settled ? (
                    <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-400">
                      Saldada
                    </span>
                  ) : (
                    <span className="text-right">
                      <span className="block font-mono text-[15px] font-medium tabular-nums">
                        {formatCents(sale.pendingAmount)}
                      </span>
                      <span
                        className={`block text-[11px] font-semibold ${sale.overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {sale.overdueCount > 0
                          ? `⚠ ${sale.overdueCount} vencida${sale.overdueCount > 1 ? "s" : ""}`
                          : "al día"}
                      </span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <div className="md:hidden">
        <Button
          asChild
          size="lg"
          className="fixed inset-x-4 bottom-4 z-40 h-13 shadow-lg shadow-emerald-400/20"
        >
          <Link href="/ventas/nueva">
            <Plus className="size-5" /> Nueva venta
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}

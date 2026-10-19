import { Plus } from "lucide-react";
import Link from "next/link";
import * as R from "remeda";
import { useCases } from "@/backend/application/container";
import { toUserView } from "@/backend/modules/accounts/adapters/in/next/user-view";
import { toGroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { todayInLima } from "@/lib/dates";
import { formatCents } from "@/lib/money";

export default async function LoansPage() {
  const { user, group } = await requireMembership();
  const loans = await useCases.listLoans.execute({
    groupId: group.id,
    today: todayInLima(),
  });
  const overdueCount = R.sumBy(loans, (l) => l.overdueCount);

  return (
    <AppShell
      user={toUserView(user)}
      group={toGroupView(group)}
      active="loans"
      overdueCount={overdueCount}
      title="Préstamos"
      subtitle="Capital prestado y cronogramas"
      actions={
        <Button asChild>
          <Link href="/prestamos/nuevo">
            <Plus className="size-4" /> Nuevo préstamo
          </Link>
        </Button>
      }
    >
      {loans.length === 0 ? (
        <section className="flex max-w-2xl flex-col items-center rounded-2xl border border-dashed border-input p-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-2xl text-emerald-400">
            →
          </div>
          <p className="mt-4 font-medium">Aún no hay préstamos</p>
          <p className="mt-1 max-w-xs text-muted-foreground text-sm">
            Crea el primero: el cronograma de cuotas se genera solo.
          </p>
          <Button asChild className="mt-4">
            <Link href="/prestamos/nuevo">Crear préstamo</Link>
          </Button>
        </section>
      ) : (
        <ul className="max-w-2xl space-y-2.5">
          {loans.map((loan) => {
            const voided = loan.status === "voided";
            return (
              <li key={loan.id}>
                <Link
                  href={`/prestamos/${loan.id}`}
                  className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-input ${voided ? "opacity-60" : ""}`}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary font-bold">
                    {loan.borrowerName[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-[15px] font-bold ${voided ? "line-through" : ""}`}
                    >
                      {loan.borrowerName}
                    </span>
                    <span className="block text-[12.5px] text-zinc-500">
                      {loan.collectedCount}/{loan.totalCount} cobradas
                    </span>
                  </span>
                  {voided ? (
                    <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                      Anulado
                    </span>
                  ) : (
                    <span className="text-right">
                      <span className="block font-mono text-[15px] font-medium tabular-nums">
                        {formatCents(loan.pendingAmount)}
                      </span>
                      <span
                        className={`block text-[11px] font-semibold ${loan.overdueCount > 0 ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {loan.overdueCount > 0
                          ? `⚠ ${loan.overdueCount} vencida${loan.overdueCount > 1 ? "s" : ""}`
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
          <Link href="/prestamos/nuevo">
            <Plus className="size-5" /> Nuevo préstamo
          </Link>
        </Button>
      </div>
    </AppShell>
  );
}

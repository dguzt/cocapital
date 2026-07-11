import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/backend/modules/accounts/current-user";
import { findGroupOf } from "@/backend/modules/groups/data";
import { getLoan, listGroupInstallments } from "@/backend/modules/loans/data";
import { listPendingChanges } from "@/backend/modules/movements/changes-data";
import { CollectButton } from "@/components/loans/collect-button";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { isOverdue, todayInLima } from "@/lib/dates";
import { formatCents } from "@/lib/money";

const MONTHS = "ene feb mar abr may jun jul ago sep oct nov dic".split(" ");
function shortDate(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}

export default async function LoanDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const group = await findGroupOf(user.id);
  if (!group) return null;
  const { id } = await params;
  const loan = await getLoan(group.id, id);
  if (!loan.ok) notFound();

  const today = todayInLima();
  const groupInstallments = await listGroupInstallments(group.id);
  const overdueCount = groupInstallments.filter(
    (i) => i.status === "pending" && isOverdue(i.dueDate, today),
  ).length;

  // A "deshacer cobro" is proposed on the cuota's repay movement, but the user
  // looks for it HERE — so surface it on the cuota it will undo.
  const pendingChanges = await listPendingChanges(group.id);
  const undoPending = new Set(
    pendingChanges.filter((c) => c.kind === "void").map((c) => c.movementId),
  );
  const rate = (loan.value.rateBps / 100).toFixed(
    loan.value.rateBps % 100 === 0 ? 0 : 2,
  );
  const summary = [
    { label: "Prestado", value: loan.value.capital, cls: "" },
    {
      label: "Ganancia esperada",
      value: loan.value.expectedInterest,
      cls: "text-emerald-400",
    },
    { label: "Cobrado", value: loan.value.collectedAmount, cls: "" },
    { label: "Pendiente", value: loan.value.pendingAmount, cls: "" },
  ];

  return (
    <AppShell
      user={user}
      group={group}
      active="loans"
      overdueCount={overdueCount}
      title={loan.value.borrowerName}
      subtitle={`${formatCents(loan.value.capital)} al ${rate}%`}
      actions={
        <Button asChild variant="outline">
          <Link href="/prestamos">
            <ArrowLeft className="size-4" /> Préstamos
          </Link>
        </Button>
      }
    >
      <div className="flex max-w-3xl flex-col gap-5">
        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {summary.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-border bg-card p-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {s.label}
              </p>
              <p
                className={`mt-1.5 font-mono text-lg font-semibold tabular-nums ${s.cls}`}
              >
                {formatCents(s.value)}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Cuotas</h2>
          <ul className="mt-2 divide-y divide-border">
            {loan.value.installments.map((inst) => {
              const overdue =
                inst.status === "pending" && isOverdue(inst.dueDate, today);
              const awaitingUndo =
                inst.repayMovementId !== null &&
                undoPending.has(inst.repayMovementId);
              return (
                <li key={inst.id} className="flex items-center gap-3 py-3.5">
                  <span className="w-16 shrink-0 text-[15px] font-medium">
                    Cuota {inst.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[13px] text-muted-foreground">
                      {shortDate(inst.dueDate)}
                    </span>
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        awaitingUndo
                          ? "bg-amber-400/15 text-amber-400"
                          : inst.status === "collected"
                            ? "bg-emerald-400/15 text-emerald-400"
                            : overdue
                              ? "bg-red-400/15 text-red-400"
                              : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {awaitingUndo
                        ? "Deshacer cobro · falta el OK"
                        : inst.status === "collected"
                          ? "Cobrada"
                          : overdue
                            ? "Vencida"
                            : "Pendiente"}
                    </span>
                  </span>
                  <span className="w-24 text-right font-mono text-[15px] font-medium tabular-nums">
                    {formatCents(inst.amount)}
                  </span>
                  {inst.status === "pending" ? (
                    <CollectButton
                      loanId={loan.value.id}
                      installmentId={inst.id}
                      number={inst.number}
                      amountCents={inst.amount}
                      borrowerName={loan.value.borrowerName}
                    />
                  ) : (
                    <span
                      className={`w-[68px] text-center text-xs ${
                        awaitingUndo ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {awaitingUndo ? "⏳" : "✓"}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}

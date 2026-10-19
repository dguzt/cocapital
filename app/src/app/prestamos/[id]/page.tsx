import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useCases } from "@/backend/application/container";
import { toUserView } from "@/backend/modules/accounts/adapters/in/next/user-view";
import { toGroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";
import { CollectButton } from "@/components/loans/collect-button";
import { HighlightCuota } from "@/components/loans/highlight-cuota";
import { UndoCollectionButton } from "@/components/loans/undo-collection-button";
import { VoidLoanButton } from "@/components/loans/void-loan-button";
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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cuota?: string }>;
}) {
  const { user, group } = await requireMembership();
  const { id } = await params;
  const { cuota: highlightId } = await searchParams;
  const loan = await useCases.getLoanDetail.execute({
    groupId: group.id,
    loanId: id,
  });
  if (!loan.ok) notFound();

  const today = todayInLima();
  const groupInstallments = await useCases.listGroupInstallments.execute({
    groupId: group.id,
  });
  const overdueCount = groupInstallments.filter(
    (i) => i.status === "pending" && isOverdue(i.dueDate, today),
  ).length;

  // A "deshacer cobro" is proposed on the cuota's repay movement, but the user
  // looks for it HERE — so surface it on the cuota it will undo.
  const pendingChanges = await useCases.listPendingChanges.execute({
    groupId: group.id,
  });
  const undoPending = new Set(
    pendingChanges.filter((c) => c.kind === "void").map((c) => c.movementId),
  );
  const isVoided = loan.value.status === "voided";
  // A pending cancellation is a pending void on the loan's own lend movement.
  const voidPending = undoPending.has(loan.value.lendMovementId);
  const collectedCount = loan.value.installments.filter(
    (i) => i.status === "collected",
  ).length;
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
      user={toUserView(user)}
      group={toGroupView(group)}
      active="loans"
      overdueCount={overdueCount}
      title={loan.value.borrowerName}
      subtitle={`${formatCents(loan.value.capital)} al ${rate}%`}
      actions={
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/prestamos">
              <ArrowLeft className="size-4" /> Préstamos
            </Link>
          </Button>
          {!isVoided && !voidPending && (
            <VoidLoanButton
              loanId={loan.value.id}
              borrowerName={loan.value.borrowerName}
              capitalCents={loan.value.capital}
              collectedCount={collectedCount}
            />
          )}
        </div>
      }
    >
      <div className="flex max-w-3xl flex-col gap-5">
        {isVoided && (
          <section className="rounded-2xl border border-border bg-secondary p-4">
            <p className="text-sm font-semibold">Préstamo anulado</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Se revirtió por completo: el capital volvió a caja y sus cobros
              fueron deshechos.
            </p>
          </section>
        )}
        {!isVoided && voidPending && (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
            <p className="text-sm font-semibold text-amber-400">
              Anulación pendiente — falta el OK de tu socio
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Se revierte el préstamo completo cuando tu socio lo apruebe.
            </p>
          </section>
        )}
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
          <HighlightCuota targetId={highlightId ?? null} />
          <h2 className="font-semibold">Cuotas</h2>
          <ul className="mt-2 divide-y divide-border">
            {loan.value.installments.map((inst) => {
              const overdue =
                inst.status === "pending" && isOverdue(inst.dueDate, today);
              const awaitingUndo =
                inst.repayMovementId !== null &&
                undoPending.has(inst.repayMovementId);
              return (
                <li
                  key={inst.id}
                  id={`cuota-${inst.id}`}
                  className="flex items-center gap-2 rounded-lg py-3.5 md:gap-3"
                >
                  <span className="w-14 shrink-0 text-[15px] font-medium md:w-16">
                    Cuota {inst.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[13px] text-muted-foreground">
                      {shortDate(inst.dueDate)}
                    </span>
                    <span
                      className={`mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        awaitingUndo
                          ? "bg-amber-400/15 text-amber-400"
                          : inst.status === "collected"
                            ? "bg-emerald-400/15 text-emerald-400"
                            : overdue
                              ? "bg-red-400/15 text-red-400"
                              : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {awaitingUndo ? (
                        <>
                          <span className="md:hidden">Falta OK</span>
                          <span className="hidden md:inline">
                            Deshacer cobro · falta el OK
                          </span>
                        </>
                      ) : inst.status === "collected" ? (
                        "Cobrada"
                      ) : overdue ? (
                        "Vencida"
                      ) : (
                        "Pendiente"
                      )}
                    </span>
                  </span>
                  <span className="w-20 text-right font-mono text-[15px] font-medium tabular-nums md:w-24">
                    {formatCents(inst.amount)}
                  </span>
                  {isVoided ? (
                    <span className="w-11 text-center text-xs text-muted-foreground md:w-[68px]">
                      —
                    </span>
                  ) : inst.status === "pending" ? (
                    <CollectButton
                      loanId={loan.value.id}
                      installmentId={inst.id}
                      number={inst.number}
                      amountCents={inst.amount}
                      borrowerName={loan.value.borrowerName}
                    />
                  ) : awaitingUndo || inst.repayMovementId === null ? (
                    <span
                      className={`w-11 text-center text-xs md:w-[68px] ${
                        awaitingUndo ? "text-amber-400" : "text-emerald-400"
                      }`}
                    >
                      {awaitingUndo ? "⏳" : "✓"}
                    </span>
                  ) : (
                    <UndoCollectionButton
                      repayMovementId={inst.repayMovementId}
                      number={inst.number}
                      amountCents={inst.amount}
                      borrowerName={loan.value.borrowerName}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* The header actions are desktop-only; surface Anular on mobile here. */}
        {!isVoided && !voidPending && (
          <div className="md:hidden">
            <VoidLoanButton
              loanId={loan.value.id}
              borrowerName={loan.value.borrowerName}
              capitalCents={loan.value.capital}
              collectedCount={collectedCount}
              className="w-full"
              label="Anular préstamo"
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}

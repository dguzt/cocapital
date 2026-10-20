import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useCases } from "@/backend/application/container";
import { toUserView } from "@/backend/modules/accounts/adapters/in/next/user-view";
import { toGroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";
import { toCreditSaleView } from "@/backend/modules/inventory/adapters/in/next/credit-sale-view";
import { CollectSaleButton } from "@/components/sales/collect-sale-button";
import { ReplanButton } from "@/components/sales/replan-button";
import { UndoSaleCollectionButton } from "@/components/sales/undo-sale-collection-button";
import { VoidCreditSaleButton } from "@/components/sales/void-credit-sale-button";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { formatDayMonth, isOverdue, todayInLima } from "@/lib/dates";
import { formatCents } from "@/lib/money";

function cuotaLabel(number: number) {
  return number === 0 ? "Inicial" : `Cuota ${number}`;
}

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, group } = await requireMembership();
  const { id } = await params;
  const found = await useCases.getCreditSale.execute({
    groupId: group.id,
    saleId: id,
  });
  if (!found.ok) notFound();

  const today = todayInLima();
  const [installments, pendingChanges] = await Promise.all([
    useCases.listGroupInstallments.execute({ groupId: group.id }),
    useCases.listPendingChanges.execute({ groupId: group.id }),
  ]);
  const overdueCount = installments.filter(
    (i) => i.status === "pending" && isOverdue(i.dueDate, today),
  ).length;

  const sale = toCreditSaleView(found.value, today);
  const undoPending = new Set(
    pendingChanges.filter((c) => c.kind === "void").map((c) => c.movementId),
  );
  const isVoided = sale.status === "voided";
  const voidPending = undoPending.has(sale.saleMovementId);
  const pendingRows = sale.installments.filter((i) => i.status === "pending");
  const summary = [
    { label: "Precio", value: sale.price, cls: "" },
    {
      label: "Margen esperado",
      value: sale.expectedMargin,
      cls: "text-emerald-400",
    },
    { label: "Cobrado", value: sale.collectedAmount, cls: "" },
    { label: "Pendiente", value: sale.pendingAmount, cls: "" },
  ];

  const voidButton = (className?: string, label?: string) => (
    <VoidCreditSaleButton
      saleId={sale.id}
      buyerName={sale.buyerName}
      item={sale.item}
      collectedCount={sale.collectedCount}
      collectedCents={sale.collectedAmount}
      className={className}
      label={label}
    />
  );

  return (
    <AppShell
      user={toUserView(user)}
      group={toGroupView(group)}
      active="sales"
      overdueCount={overdueCount}
      title={sale.buyerName}
      subtitle={`${sale.item} · ${formatCents(sale.price)}${sale.cost !== null ? ` · costo ${formatCents(sale.cost)}` : ""}`}
      actions={
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/ventas">
              <ArrowLeft className="size-4" /> Ventas
            </Link>
          </Button>
          {!isVoided && !voidPending && voidButton()}
        </div>
      }
    >
      <div className="flex max-w-3xl flex-col gap-5">
        {isVoided && (
          <section className="rounded-2xl border border-border bg-secondary p-4">
            <p className="text-sm font-semibold">Venta anulada</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Se revirtió por completo: lo vendido volvió al inventario y sus
              cobros fueron deshechos.
            </p>
          </section>
        )}
        {!isVoided && voidPending && (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
            <p className="text-sm font-semibold text-amber-400">
              Anulación pendiente — falta el OK de tu socio
            </p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Se revierte la venta completa cuando tu socio lo apruebe.
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Cuotas</h2>
            {!isVoided && pendingRows.length > 0 && (
              <ReplanButton
                saleId={sale.id}
                pendingCents={sale.pendingAmount}
                pendingCount={pendingRows.length}
                frequency={sale.frequency}
              />
            )}
          </div>
          <ul className="mt-2 divide-y divide-border">
            {sale.installments.map((inst) => {
              const label = cuotaLabel(inst.number);
              const awaitingUndo =
                inst.collectMovementId !== null &&
                undoPending.has(inst.collectMovementId);
              const margin =
                inst.costShare !== null && sale.cost !== null
                  ? inst.amount - inst.costShare
                  : null;
              return (
                <li
                  key={inst.id}
                  className="flex items-center gap-2 rounded-lg py-3.5 md:gap-3"
                >
                  <span className="w-14 shrink-0 text-[15px] font-medium md:w-16">
                    {label}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[13px] text-muted-foreground">
                      {formatDayMonth(inst.dueDate)}
                      {margin !== null && (
                        <span className="hidden md:inline">
                          {" "}
                          · {formatCents(inst.costShare ?? 0)} costo +{" "}
                          {formatCents(margin)} margen
                        </span>
                      )}
                    </span>
                    <span
                      className={`mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        awaitingUndo
                          ? "bg-amber-400/15 text-amber-400"
                          : inst.status === "collected"
                            ? "bg-emerald-400/15 text-emerald-400"
                            : inst.overdue
                              ? "bg-red-400/15 text-red-400"
                              : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {awaitingUndo
                        ? "Falta OK"
                        : inst.status === "collected"
                          ? "Cobrada"
                          : inst.overdue
                            ? "Vencida"
                            : "Pendiente"}
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
                    <CollectSaleButton
                      saleId={sale.id}
                      installmentId={inst.id}
                      label={label.toLowerCase()}
                      amountCents={inst.amount}
                      buyerName={sale.buyerName}
                    />
                  ) : awaitingUndo || inst.collectMovementId === null ? (
                    <span className="w-11 text-center text-xs text-amber-400 md:w-[68px]">
                      ⏳
                    </span>
                  ) : (
                    <UndoSaleCollectionButton
                      collectMovementId={inst.collectMovementId}
                      label={label.toLowerCase()}
                      amountCents={inst.amount}
                      buyerName={sale.buyerName}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {!isVoided && !voidPending && (
          <div className="md:hidden">
            {voidButton("w-full", "Anular venta")}
          </div>
        )}
      </div>
    </AppShell>
  );
}

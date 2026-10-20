import { useCases } from "@/backend/application/container";
import { toUserView } from "@/backend/modules/accounts/adapters/in/next/user-view";
import { toGroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";
import { ActivityFeed } from "@/components/movements/activity-feed";
import { ActivityTable } from "@/components/movements/activity-table";
import { PendingApprovals } from "@/components/movements/pending-approvals";
import { AppShell } from "@/components/shell/app-shell";
import { isOverdue, todayInLima } from "@/lib/dates";

export default async function ActivityPage() {
  const { user, group } = await requireMembership();

  const today = todayInLima();
  const [movements, installments, pendingChanges, planChanges] =
    await Promise.all([
      useCases.listMovements.execute({ groupId: group.id }),
      useCases.listGroupInstallments.execute({ groupId: group.id }),
      useCases.listPendingChanges.execute({ groupId: group.id }),
      useCases.listPlanChanges.execute({ groupId: group.id }),
    ]);
  const overdueCount = installments.filter(
    (i) => i.status === "pending" && isOverdue(i.dueDate, today),
  ).length;
  const approvalsForMe = pendingChanges.filter((c) => c.proposedBy !== user.id);
  const pendingIds = pendingChanges.map((c) => c.movementId);

  return (
    <AppShell
      user={toUserView(user)}
      group={toGroupView(group)}
      active="activity"
      overdueCount={overdueCount}
      title="Actividad"
      subtitle="Todos los movimientos del grupo"
    >
      <div className="flex max-w-4xl flex-col gap-5">
        <PendingApprovals items={approvalsForMe} />
        <section className="rounded-2xl border border-border bg-card p-5">
          {movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aún no hay movimientos.
            </p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <ActivityTable
                  movements={movements}
                  planChanges={planChanges}
                  today={today}
                  pendingIds={pendingIds}
                />
              </div>
              <div className="md:hidden">
                <ActivityFeed
                  movements={movements}
                  planChanges={planChanges}
                  today={today}
                  pendingIds={pendingIds}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}

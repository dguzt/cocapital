import { readActivityPage } from "@/backend/application/activity-page";
import { useCases } from "@/backend/application/container";
import { toUserView } from "@/backend/modules/accounts/adapters/in/next/user-view";
import { toGroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";
import { ActivityList } from "@/components/movements/activity-list";
import { PendingApprovals } from "@/components/movements/pending-approvals";
import { AppShell } from "@/components/shell/app-shell";
import { getDictionary } from "@/i18n/get-dictionary";
import { todayInLima } from "@/lib/dates";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { user, group } = await requireMembership(groupId);

  const today = todayInLima();
  const [first, overdueCount, pendingChanges] = await Promise.all([
    readActivityPage(group.id, {}),
    useCases.countOverdueInstallments.execute({ groupId: group.id, today }),
    useCases.listPendingChanges.execute({ groupId: group.id }),
  ]);
  const approvalsForMe = pendingChanges.filter((c) => c.proposedBy !== user.id);
  const pendingIds = pendingChanges.map((c) => c.movementId);
  const t = (await getDictionary()).activity;

  return (
    <AppShell
      user={toUserView(user)}
      group={toGroupView(group)}
      active="activity"
      overdueCount={overdueCount}
      title={t.title}
      subtitle={t.subtitle}
    >
      <div className="flex max-w-4xl flex-col gap-5">
        <PendingApprovals items={approvalsForMe} />
        <section className="rounded-2xl border border-border bg-card p-5">
          {first.movements.length === 0 && first.planChanges.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t.empty}
            </p>
          ) : (
            <ActivityList first={first} today={today} pendingIds={pendingIds} />
          )}
        </section>
      </div>
    </AppShell>
  );
}

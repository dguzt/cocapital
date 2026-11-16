import { Activity } from "lucide-react";
import Link from "next/link";
import { useCases } from "@/backend/application/container";
import { toUserView } from "@/backend/modules/accounts/adapters/in/next/user-view";
import { toGroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";
import { PanelContent } from "@/components/dashboard/dashboard";
import { InviteBanner } from "@/components/dashboard/invite-banner";
import { MovementSheet } from "@/components/movements/movement-sheet";
import { PendingApprovals } from "@/components/movements/pending-approvals";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/i18n/get-dictionary";
import { todayInLima } from "@/lib/dates";
import { groupPath } from "@/lib/group-path";

export default async function PanelPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { user, group } = await requireMembership(groupId);

  const today = todayInLima();
  const [{ movements, capital }, overdueCount, pendingChanges] =
    await Promise.all([
      useCases.getPanel.execute({ groupId: group.id }),
      useCases.countOverdueInstallments.execute({ groupId: group.id, today }),
      useCases.listPendingChanges.execute({ groupId: group.id }),
    ]);
  const t = await getDictionary();
  const approvalsForMe = pendingChanges.filter((c) => c.proposedBy !== user.id);
  const pendingIds = pendingChanges.map((c) => c.movementId);

  return (
    <AppShell
      user={toUserView(user)}
      group={toGroupView(group)}
      active="panel"
      overdueCount={overdueCount}
      title={t.panel.title}
      subtitle={t.panel.subtitle}
      actions={
        <>
          <Button asChild variant="outline">
            <Link href={groupPath(group.id, "/actividad")}>
              <Activity className="size-4" /> {t.panel.activity}
            </Link>
          </Button>
          <MovementSheet />
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {group.isAlone() && <InviteBanner code={group.inviteCode.value} />}
        <PendingApprovals items={approvalsForMe} />
        <PanelContent
          groupId={group.id}
          user={toUserView(user)}
          movements={movements}
          capital={capital}
          pendingIds={pendingIds}
          today={today}
          t={t.dashboard}
        />
      </div>
    </AppShell>
  );
}

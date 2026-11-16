import { useCases } from "@/backend/application/container";
import { toUserView } from "@/backend/modules/accounts/adapters/in/next/user-view";
import { toContactView } from "@/backend/modules/contacts/adapters/in/next/contact-view";
import { toGroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";
import { LoanWizard } from "@/components/loans/loan-wizard/loan-wizard";
import { AppShell } from "@/components/shell/app-shell";
import { getDictionary } from "@/i18n/get-dictionary";
import { todayInLima } from "@/lib/dates";

export default async function NewLoanPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  const { user, group } = await requireMembership(groupId);
  const today = todayInLima();
  const [contacts, overdueCount] = await Promise.all([
    useCases.listContacts.execute({ groupId: group.id }),
    useCases.countOverdueInstallments.execute({ groupId: group.id, today }),
  ]);
  const t = (await getDictionary()).loans;

  return (
    <AppShell
      user={toUserView(user)}
      group={toGroupView(group)}
      active="loans"
      overdueCount={overdueCount}
      title={t.newLoan}
      subtitle={t.newSubtitle}
    >
      <div className="max-w-2xl">
        <LoanWizard contacts={contacts.map(toContactView)} />
      </div>
    </AppShell>
  );
}

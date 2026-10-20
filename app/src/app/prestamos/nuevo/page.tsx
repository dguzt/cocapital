import { useCases } from "@/backend/application/container";
import { toUserView } from "@/backend/modules/accounts/adapters/in/next/user-view";
import { toContactView } from "@/backend/modules/contacts/adapters/in/next/contact-view";
import { toGroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";
import { LoanWizard } from "@/components/loans/loan-wizard/loan-wizard";
import { AppShell } from "@/components/shell/app-shell";
import { isOverdue, todayInLima } from "@/lib/dates";

export default async function NewLoanPage() {
  const { user, group } = await requireMembership();
  const today = todayInLima();
  const [contacts, installments] = await Promise.all([
    useCases.listContacts.execute({ groupId: group.id }),
    useCases.listGroupInstallments.execute({ groupId: group.id }),
  ]);
  const overdueCount = installments.filter(
    (i) => i.status === "pending" && isOverdue(i.dueDate, today),
  ).length;

  return (
    <AppShell
      user={toUserView(user)}
      group={toGroupView(group)}
      active="loans"
      overdueCount={overdueCount}
      title="Nuevo préstamo"
      subtitle="El cronograma se calcula solo — tú solo confirmas"
    >
      <div className="max-w-2xl">
        <LoanWizard contacts={contacts.map(toContactView)} />
      </div>
    </AppShell>
  );
}

import { useCases } from "@/backend/application/container";
import { toUserView } from "@/backend/modules/accounts/adapters/in/next/user-view";
import { toContactView } from "@/backend/modules/contacts/adapters/in/next/contact-view";
import { toGroupView } from "@/backend/modules/groups/adapters/in/next/group-view";
import { requireMembership } from "@/backend/modules/groups/adapters/in/next/membership";
import { NewSale } from "@/components/sales/new-sale";
import { AppShell } from "@/components/shell/app-shell";
import { isOverdue, todayInLima } from "@/lib/dates";

export default async function NewSalePage() {
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
      active="sales"
      overdueCount={overdueCount}
      title="Nueva venta"
      subtitle="Al contado o en cuotas"
    >
      <div className="max-w-2xl">
        <NewSale contacts={contacts.map(toContactView)} />
      </div>
    </AppShell>
  );
}

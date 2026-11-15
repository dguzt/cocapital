import { useCases } from "@/backend/application/container";
import { requireUser } from "@/backend/modules/accounts/adapters/in/next/session";
import { Onboarding } from "@/components/onboarding/onboarding";
import { getDictionary } from "@/i18n/get-dictionary";

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();

  const [groups, { error }, t] = await Promise.all([
    useCases.listMyGroups.execute({ userId: user.id }),
    searchParams,
    getDictionary(),
  ]);

  return (
    <Onboarding
      userName={user.name}
      error={error}
      hasGroups={groups.length > 0}
      t={t.onboarding}
      hello={t.groups.hello}
    />
  );
}

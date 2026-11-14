import { useCases } from "@/backend/application/container";
import { requireUser } from "@/backend/modules/accounts/adapters/in/next/session";
import { Onboarding } from "@/components/onboarding/onboarding";

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();

  const [groups, { error }] = await Promise.all([
    useCases.listMyGroups.execute({ userId: user.id }),
    searchParams,
  ]);

  return (
    <Onboarding
      userName={user.name}
      error={error}
      hasGroups={groups.length > 0}
    />
  );
}

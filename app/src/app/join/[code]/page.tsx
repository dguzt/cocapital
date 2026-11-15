import Link from "next/link";
import { redirect } from "next/navigation";
import { useCases } from "@/backend/application/container";
import { requireUser } from "@/backend/modules/accounts/adapters/in/next/session";
import { Button } from "@/components/ui/button";
import { getDictionary } from "@/i18n/get-dictionary";
import { groupPath } from "@/lib/group-path";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const user = await requireUser();
  const { code } = await params;
  const result = await useCases.joinGroup.execute({
    partner: {
      userId: user.id,
      name: user.name,
    },
    code,
  });
  if (result.ok) {
    redirect(groupPath(result.value.id));
  }
  const t = (await getDictionary()).join;
  const err = t.errors[result.error.kind] ?? t.errors.InviteNotFound;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{err.title}</h1>
        <p className="text-muted-foreground text-sm">{err.body}</p>
        <Button asChild variant="secondary">
          <Link href="/">{t.goHome}</Link>
        </Button>
      </div>
    </main>
  );
}

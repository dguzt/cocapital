import Link from "next/link";
import { redirect } from "next/navigation";
import { useCases } from "@/backend/application/container";
import { requireUser } from "@/backend/modules/accounts/adapters/in/next/session";
import { Button } from "@/components/ui/button";
import { groupPath } from "@/lib/group-path";

const ERROR_TEXT: Record<string, { title: string; body: string }> = {
  InviteNotFound: {
    title: "Enlace no válido",
    body: "Este enlace de invitación no existe o fue escrito mal. Pide que te lo reenvíen.",
  },
  GroupFull: {
    title: "Este grupo está lleno",
    body: "Ya hay 10 socios en este grupo (10/10). Habla con quien te invitó.",
  },
};

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
  const err = ERROR_TEXT[result.error.kind] ?? ERROR_TEXT.InviteNotFound;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{err.title}</h1>
        <p className="text-muted-foreground text-sm">{err.body}</p>
        <Button asChild variant="secondary">
          <Link href="/">Ir al inicio</Link>
        </Button>
      </div>
    </main>
  );
}

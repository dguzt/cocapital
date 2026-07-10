import Link from "next/link";
import { requireUser } from "@/backend/modules/accounts/current-user";
import { joinGroupAction } from "@/backend/modules/groups/actions";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

const ERROR_TEXT: Record<string, { title: string; body: string }> = {
  InviteNotFound: {
    title: "Enlace no válido",
    body: "Este enlace de invitación no existe o fue escrito mal. Pide a tu socio que te lo reenvíe.",
  },
  GroupFull: {
    title: "Este grupo está lleno",
    body: "Ya hay 2 socios en este grupo (2/2). Si crees que es un error, habla con quien te invitó.",
  },
  AlreadyInGroup: {
    title: "Ya tienes un grupo",
    body: "Tu cuenta ya pertenece a otro grupo. Por ahora cada cuenta puede estar en un solo grupo.",
  },
};

/**
 * Security M2: this page only DISPLAYS the invite. Joining is a POST through
 * joinGroupAction (the button below) — rendering never mutates state.
 */
export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireUser();
  const { code } = await params;
  const { error } = await searchParams;

  if (error) {
    const err = ERROR_TEXT[error] ?? ERROR_TEXT.InviteNotFound;
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

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Te han invitado a un grupo
        </h1>
        <p className="text-muted-foreground text-sm">
          Únete para compartir el capital y ver los movimientos con tu socio.
        </p>
        <form action={joinGroupAction} className="flex flex-col gap-2">
          <input type="hidden" name="code" value={code.toUpperCase()} />
          <SubmitButton pendingText="Uniéndote…" className="w-full">
            Unirme al grupo
          </SubmitButton>
        </form>
        <Button asChild variant="ghost">
          <Link href="/">Ahora no</Link>
        </Button>
      </div>
    </main>
  );
}

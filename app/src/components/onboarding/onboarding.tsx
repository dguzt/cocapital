import { createGroupAction } from "@/backend/modules/groups/adapters/in/next/create-group-action";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

const ERROR_TEXT: Record<string, string> = {
  InvalidGroupName: "El nombre debe tener entre 1 y 40 caracteres.",
  AlreadyInGroup: "Ya perteneces a un grupo.",
};

export function Onboarding({
  userName,
  error,
}: {
  userName: string;
  error?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-emerald-400 font-mono font-semibold text-emerald-950 shadow-lg shadow-emerald-400/25">
            S/
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Hola, {userName}
          </h1>
          <p className="text-muted-foreground text-sm">
            Crea el grupo que compartirás con tu socio, o abre el enlace de
            invitación que te enviaron.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form action={createGroupAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del grupo</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="Ej. Inversiones D&R"
                  maxLength={40}
                  required
                  className="h-12 text-base"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">
                  {ERROR_TEXT[error] ?? "Algo salió mal. Intenta de nuevo."}
                </p>
              )}
              <SubmitButton
                className="h-12 w-full"
                pendingText="Creando grupo…"
              >
                Crear grupo
              </SubmitButton>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-muted-foreground text-xs">
          ¿Te invitaron? Abre el enlace que te compartió tu socio — se une
          automáticamente a su grupo.
        </p>
      </div>
    </main>
  );
}

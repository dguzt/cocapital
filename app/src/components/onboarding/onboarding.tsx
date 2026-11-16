import Link from "next/link";
import { createGroupAction } from "@/backend/modules/groups/adapters/in/next/create-group-action";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Dictionary } from "@/i18n/dictionaries";
import { messageFor } from "@/lib/message-for";

export function Onboarding({
  userName,
  error,
  hasGroups = false,
  t,
  hello,
}: {
  userName: string;
  error?: string;
  hasGroups?: boolean;
  t: Dictionary["onboarding"];
  hello: Dictionary["groups"]["hello"];
}) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-emerald-400 font-mono font-semibold text-emerald-950 shadow-lg shadow-emerald-400/25">
            S/
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {hasGroups ? t.newGroup : hello(userName)}
          </h1>
          <p className="text-muted-foreground text-sm">{t.intro}</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form action={createGroupAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t.groupName}</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t.placeholder}
                  maxLength={40}
                  required
                  className="h-12 text-base"
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">
                  {messageFor(t.errors, error, t.genericError)}
                </p>
              )}
              <SubmitButton className="h-12 w-full" pendingText={t.creating}>
                {t.create}
              </SubmitButton>
            </form>
          </CardContent>
        </Card>

        {hasGroups && (
          <p className="text-center text-sm">
            <Link href="/" className="text-muted-foreground underline">
              {t.backToGroups}
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}

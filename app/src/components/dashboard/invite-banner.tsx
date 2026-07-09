"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InviteBanner({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const link =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/join/${code}`;

  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
      <p className="font-medium text-sm">Falta tu socio (1/2)</p>
      <p className="mt-1 text-muted-foreground text-xs">
        Comparte este enlace — al abrirlo y registrarse, entra directo a tu
        grupo.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs">
          {link || `/join/${code}`}
        </code>
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(
              `${window.location.origin}/join/${code}`,
            );
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
    </div>
  );
}

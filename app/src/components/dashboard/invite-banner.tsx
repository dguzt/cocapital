"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function InviteBanner({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
      <p className="font-medium text-sm">Estás solo en este grupo</p>
      <p className="mt-1 text-muted-foreground text-xs">
        Puedes usarlo así. Si invitas a un socio con este enlace, las
        correcciones pasan a pedir su OK.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs">
          /join/{code}
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

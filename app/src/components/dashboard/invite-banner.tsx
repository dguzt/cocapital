"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useDictionary } from "@/i18n/i18n-provider";

export function InviteBanner({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const t = useDictionary().inviteBanner;

  return (
    <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
      <p className="font-medium text-sm">{t.title}</p>
      <p className="mt-1 text-muted-foreground text-xs">{t.body}</p>
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
          {copied ? t.copied : t.copy}
        </Button>
      </div>
    </div>
  );
}

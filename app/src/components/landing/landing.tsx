import {
  HandCoins,
  PieChart,
  ReceiptText,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionaries";
import { formatCents } from "@/lib/money";

type LandingCopy = Dictionary["landing"];

const FEATURE_ICONS = [
  <Zap key="zap" className="size-5" />,
  <PieChart key="pie" className="size-5" />,
  <HandCoins key="loans" className="size-5" />,
  <ReceiptText key="sales" className="size-5" />,
  <ShieldCheck key="trust" className="size-5" />,
  <Users key="groups" className="size-5" />,
];

const REPO_URL = "https://github.com/dguzt/cocapital";

/**
 * A static echo of the real capital panel: the product is the pitch.
 * @param t - the preview copy
 */
function CapitalPreview({ t }: { t: LandingCopy["preview"] }) {
  const buckets = [
    { label: t.cash, value: 52000, swatch: "bg-capital-cash", pct: "50.5%" },
    { label: t.lent, value: 30000, swatch: "bg-capital-lent", pct: "29.1%" },
    {
      label: t.inventory,
      value: 13000,
      swatch: "bg-capital-inventory",
      pct: "12.6%",
    },
    {
      label: t.receivable,
      value: 8000,
      swatch: "bg-capital-receivable",
      pct: "7.8%",
    },
  ];

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-[#121215] p-6 shadow-2xl shadow-black/40">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {t.totalCapital}
      </p>
      <p className="mt-2 font-mono text-4xl font-semibold tracking-tighter tabular-nums">
        {formatCents(103000)}
      </p>
      <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-lg bg-secondary">
        {buckets.map((b) => (
          <div key={b.label} className={b.swatch} style={{ width: b.pct }} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {buckets.map((b) => (
          <div
            key={b.label}
            className="rounded-xl border border-border bg-sidebar p-3"
          >
            <div className="flex items-center gap-1.5">
              <span className={`size-2 rounded-sm ${b.swatch}`} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {b.label}
              </span>
            </div>
            <p className="mt-1.5 whitespace-nowrap font-mono text-sm font-semibold tabular-nums">
              {formatCents(b.value)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-4 inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-[11px] text-muted-foreground">
        {t.profit} · {formatCents(3750)}
      </p>
    </div>
  );
}

/**
 * Public landing for visitors, in their language.
 * @param t - the landing copy
 */
export function Landing({ t }: { t: LandingCopy }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 md:px-8">
      <header className="flex items-center gap-3 py-5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-400 font-mono text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-400/25">
          S/
        </span>
        <span className="flex-1 text-lg font-semibold tracking-tight">
          CoCapital
        </span>
        <LanguageSwitcher />
        <Button asChild variant="ghost">
          <Link href="/sign-in">{t.signIn}</Link>
        </Button>
      </header>

      <main className="flex flex-1 flex-col justify-center py-10">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
              {t.eyebrow}
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
              {t.titleStart}{" "}
              <span className="text-emerald-400">{t.titleAccent}</span>
            </h1>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted-foreground">
              {t.lead}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-13 px-7 text-base">
                <Link href="/sign-up">{t.signUp}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="h-13 px-6 text-base"
              >
                <Link href="/sign-in">{t.haveAccount}</Link>
              </Button>
            </div>
          </div>
          <CapitalPreview t={t.preview} />
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.features.map((f, i) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400">
                {FEATURE_ICONS[i]}
              </span>
              <h2 className="mt-3.5 font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="flex flex-col items-center gap-2 border-t border-border py-6 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between">
        <span>CoCapital · {t.footer}</span>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-4 hover:text-foreground hover:underline"
        >
          {t.openSource}
        </a>
      </footer>
    </div>
  );
}

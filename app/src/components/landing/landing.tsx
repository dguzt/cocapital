/** Public landing (logged-out "/") — same visual world as the app. */
import { HandCoins, PieChart, ShieldCheck, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";

const FEATURES = [
  {
    icon: <Zap className="size-5" />,
    title: "Registra en ~10 segundos",
    body: "Aporte, compra, venta o gasto — desde tu teléfono, sin fórmulas ni cuadernos.",
  },
  {
    icon: <PieChart className="size-5" />,
    title: "El capital siempre claro",
    body: "Total, efectivo, inventario y prestado. Se calcula solo, al instante, para los dos.",
  },
  {
    icon: <HandCoins className="size-5" />,
    title: "Préstamos con cronograma",
    body: "Cuotas, fechas e interés generados automáticamente. Cobrar es confirmar con un toque.",
  },
  {
    icon: <ShieldCheck className="size-5" />,
    title: "Confianza entre socios",
    body: "Toda corrección necesita el OK del otro socio, y el historial nunca se borra.",
  },
];

/** Static echo of the real dashboard hero — the product IS the pitch. */
function CapitalPreview() {
  const buckets = [
    { label: "Efectivo", value: 52000, swatch: "bg-emerald-400", pct: "50.5%" },
    { label: "Inventario", value: 21000, swatch: "bg-zinc-500", pct: "20.4%" },
    { label: "Prestado", value: 30000, swatch: "bg-zinc-700", pct: "29.1%" },
  ];
  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-[#121215] p-6 shadow-2xl shadow-black/40">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Capital total
      </p>
      <p className="mt-2 font-mono text-4xl font-semibold tracking-tighter tabular-nums">
        {formatCents(103000)}
      </p>
      <div className="mt-4 flex h-3 gap-0.5 overflow-hidden rounded-lg bg-secondary">
        {buckets.map((b) => (
          <div key={b.label} className={b.swatch} style={{ width: b.pct }} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2.5">
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
        Ganancia del grupo · {formatCents(3750)}
      </p>
    </div>
  );
}

export function Landing() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-5 md:px-8">
      <header className="flex items-center gap-3 py-5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-400 font-mono text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-400/25">
          S/
        </span>
        <span className="flex-1 text-lg font-semibold tracking-tight">
          cocapital
        </span>
        <Button asChild variant="ghost">
          <Link href="/sign-in">Iniciar sesión</Link>
        </Button>
      </header>

      <main className="flex flex-1 flex-col justify-center py-10">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
              Para socios que comparten capital
            </p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl">
              El capital de tu negocio,{" "}
              <span className="text-emerald-400">claro para los dos.</span>
            </h1>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted-foreground">
              Registra aportes, ventas, gastos y préstamos en segundos — y sepan
              siempre cuánto capital tienen y dónde está. Sin cuadernos, sin
              discusiones.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-13 px-7 text-base">
                <Link href="/sign-up">Crear cuenta gratis</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="h-13 px-6 text-base"
              >
                <Link href="/sign-in">Ya tengo cuenta</Link>
              </Button>
            </div>
          </div>
          <CapitalPreview />
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-400">
                {f.icon}
              </span>
              <h2 className="mt-3.5 font-semibold">{f.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        cocapital · capital compartido entre socios, claro y al día
      </footer>
    </div>
  );
}

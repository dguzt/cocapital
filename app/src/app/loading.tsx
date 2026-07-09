/** Instant skeleton while the RSC fetches (auth + group + ledger).
 *  This is what makes server components feel fast: the shell paints
 *  immediately, data streams in behind it. */
export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl animate-pulse flex-col gap-5 p-4 pt-8 md:p-8">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-secondary" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-32 rounded bg-secondary" />
          <div className="h-3 w-48 rounded bg-secondary/60" />
        </div>
        <div className="size-8 rounded-full bg-secondary" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="h-3 w-24 rounded bg-secondary/60" />
        <div className="mt-3 h-12 w-56 rounded bg-secondary" />
        <div className="mt-5 h-3 rounded-lg bg-secondary/60" />
        <div className="mt-5 grid grid-cols-3 gap-3">
          {["cash", "inventory", "lent"].map((k) => (
            <div
              key={k}
              className="h-20 rounded-xl border border-border bg-background"
            />
          ))}
        </div>
      </div>
      <div className="h-64 rounded-2xl border border-border bg-card" />
    </div>
  );
}

"use client";
/** UC-301: search-or-create. Typing a name that doesn't exist creates it. */
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Borrower = { id: string; name: string };

export function BorrowerPicker({
  borrowers,
  query,
  selected,
  onQueryChange,
  onSelect,
}: {
  borrowers: Borrower[];
  query: string;
  selected: Borrower | null;
  onQueryChange: (q: string) => void;
  onSelect: (b: Borrower | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const newName = query.trim();
  const filtered = borrowers.filter((b) =>
    b.name.toLowerCase().includes(newName.toLowerCase()),
  );
  const label = selected?.name ?? (newName || null);
  const isNew =
    newName &&
    !filtered.some((b) => b.name.toLowerCase() === newName.toLowerCase());

  return (
    <div className="space-y-2">
      <Label>Prestatario</Label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-4 text-base ${label ? "" : "text-muted-foreground"}`}
      >
        {label ?? "Elegir o crear prestatario"}
        <ChevronDown className="size-4 text-muted-foreground" />
      </button>

      {open && (
        <div className="space-y-1 rounded-xl border border-border bg-card p-2">
          <Input
            autoFocus
            placeholder="Buscar o escribir un nombre nuevo"
            value={query}
            onChange={(e) => {
              onQueryChange(e.target.value);
              onSelect(null);
            }}
            className="h-11 text-base"
          />
          <ul className="max-h-44 overflow-auto">
            {filtered.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(b);
                    onQueryChange(b.name);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-[15px] hover:bg-secondary"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                    {b.name[0]}
                  </span>
                  {b.name}
                </button>
              </li>
            ))}
            {isNew && (
              <li>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-full rounded-lg px-2 py-2 text-left text-[15px] text-emerald-400 hover:bg-secondary"
                >
                  + Crear "{newName}"
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

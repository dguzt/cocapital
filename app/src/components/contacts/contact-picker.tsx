"use client";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { ContactView } from "@/backend/modules/contacts/adapters/in/next/contact-view";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Picks a contact of the group, or creates one by typing a new name. */
export function ContactPicker({
  label,
  placeholder,
  contacts,
  query,
  selected,
  onQueryChange,
  onSelect,
}: {
  label: string;
  placeholder: string;
  contacts: ContactView[];
  query: string;
  selected: ContactView | null;
  onQueryChange: (q: string) => void;
  onSelect: (b: ContactView | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const newName = query.trim();
  const filtered = contacts.filter((b) =>
    b.name.toLowerCase().includes(newName.toLowerCase()),
  );
  const name = selected?.name ?? (newName || null);
  const isNew =
    newName &&
    !filtered.some((b) => b.name.toLowerCase() === newName.toLowerCase());

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex h-12 w-full items-center justify-between rounded-xl border border-input bg-card px-4 text-base ${name ? "" : "text-muted-foreground"}`}
      >
        {name ?? placeholder}
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

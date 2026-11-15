"use client";
import { useState } from "react";
import type { ContactView } from "@/backend/modules/contacts/adapters/in/next/contact-view";
import { useDictionary } from "@/i18n/i18n-provider";
import { CashSaleForm } from "./cash-sale-form";
import { CreditSaleWizard } from "./credit-sale-wizard";

type Mode = "cash" | "credit";

const TABS: Mode[] = ["cash", "credit"];

/** Vender: Al contado | En cuotas. */
export function NewSale({ contacts }: { contacts: ContactView[] }) {
  const [mode, setMode] = useState<Mode>("cash");
  const t = useDictionary().sales.tabs;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={mode === tab}
            onClick={() => setMode(tab)}
            className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
              mode === tab
                ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t[tab]}
          </button>
        ))}
      </div>
      {mode === "cash" ? (
        <CashSaleForm />
      ) : (
        <CreditSaleWizard contacts={contacts} />
      )}
    </div>
  );
}

/**
 * Undo a purchase.
 *
 * Same story as undo-sale: today inventory is a derived number, so voiding the
 * entry is the whole undo. When stock becomes real, the check that belongs here
 * is "you cannot un-buy goods you have already sold" — the stock would go
 * negative. Nobody outside this module needs to know that.
 */
import type { Write } from "@/backend/infra/db/write";
import type { VoidEntry } from "@/backend/modules/movements/usecases/void-entry";

export class UndoPurchase {
  static inject = ["voidEntry"] as const;

  constructor(private readonly voidEntry: VoidEntry) {}

  writesFor(movementId: string): Write[] {
    return this.voidEntry.writesFor(movementId);
  }
}

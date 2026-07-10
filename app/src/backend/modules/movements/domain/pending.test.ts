import { describe, expect, it } from "vitest";
import type { MovementSnapshot } from "./movement";
import {
  type DecideInput,
  decideChange,
  proposeChange,
  sanitizeEditedSnapshot,
} from "./pending";

const snapshot: MovementSnapshot = {
  type: "contribute",
  amount: 5000, // S/50 — the D1 example
  cost: null,
  concept: "aporte",
  date: "2026-07-09",
};
const edited: MovementSnapshot = { ...snapshot, amount: 4500 }; // S/45

const movement = { id: "mov-1", status: "active" as const, snapshot };

describe("proposeChange", () => {
  it("edit: captures before/after, applies nothing", () => {
    const r = proposeChange({
      movement,
      hasPendingChange: false,
      kind: "edit",
      after: edited,
      actorId: "ana",
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.before.amount).toBe(5000); // old value still the truth
      expect(r.value.after?.amount).toBe(4500);
      expect(r.value.proposedBy).toBe("ana");
    }
  });
  it("void: after is null (status change, never a delete)", () => {
    const r = proposeChange({
      movement,
      hasPendingChange: false,
      kind: "void",
      actorId: "ana",
    });
    expect(r.ok && r.value.after === null).toBe(true);
  });
  it("rejects a second change while one is pending", () => {
    const r = proposeChange({
      movement,
      hasPendingChange: true,
      kind: "edit",
      after: edited,
      actorId: "ana",
    });
    expect(!r.ok && r.error.kind === "ChangeAlreadyPending").toBe(true);
  });
  it("rejects changes to a voided movement", () => {
    const r = proposeChange({
      movement: { ...movement, status: "voided" },
      hasPendingChange: false,
      kind: "void",
      actorId: "ana",
    });
    expect(!r.ok && r.error.kind === "MovementVoided").toBe(true);
  });
  it("rejects an edit without new values", () => {
    const r = proposeChange({
      movement,
      hasPendingChange: false,
      kind: "edit",
      actorId: "ana",
    });
    expect(!r.ok && r.error.kind === "MissingChanges").toBe(true);
  });
});

describe("sanitizeEditedSnapshot — Security H1", () => {
  const trusted: MovementSnapshot = {
    type: "expense",
    amount: 5000,
    cost: null,
    concept: "luz",
    date: "2026-07-09",
  };

  it("keeps type and date from the trusted row, ignoring a forged proposal", () => {
    const forged: MovementSnapshot = {
      type: "contribute", // attacker tries to reclassify
      amount: 4500,
      cost: null,
      concept: "editado",
      date: "2020-01-01", // attacker tries to back-date
    };
    const safe = sanitizeEditedSnapshot(trusted, forged);
    expect(safe.type).toBe("expense"); // preserved
    expect(safe.date).toBe("2026-07-09"); // preserved
    expect(safe.amount).toBe(4500); // legitimately editable
    expect(safe.concept).toBe("editado"); // legitimately editable
  });

  it("drops cost smuggled onto a non-sell movement", () => {
    const forged: MovementSnapshot = {
      type: "sell_inventory", // forged so the action would let cost through
      amount: 4500,
      cost: 9999,
      concept: "x",
      date: "2020-01-01",
    };
    const safe = sanitizeEditedSnapshot(trusted, forged);
    expect(safe.cost).toBeNull(); // trusted type is expense → no cost
  });

  it("preserves cost on a genuine sell_inventory movement", () => {
    const sell: MovementSnapshot = {
      ...trusted,
      type: "sell_inventory",
      cost: 3000,
    };
    const safe = sanitizeEditedSnapshot(sell, { ...sell, cost: 3500 });
    expect(safe.type).toBe("sell_inventory");
    expect(safe.cost).toBe(3500);
  });
});

describe("decideChange", () => {
  const pendingEdit: DecideInput["pending"] = {
    id: "pc-1",
    status: "pending",
    proposedBy: "ana",
    kind: "edit",
    after: edited,
  };

  it("partner approves an edit → apply new snapshot", () => {
    const r = decideChange({
      pending: pendingEdit,
      decision: "approve",
      actorId: "rosa",
    });
    expect(r.ok).toBe(true);
    if (r.ok && r.value.apply && r.value.action.kind === "edit") {
      expect(r.value.action.newSnapshot.amount).toBe(4500);
      expect(r.value.pendingStatus).toBe("approved");
    } else {
      throw new Error("expected applied edit");
    }
  });
  it("partner rejects → nothing applies, original stands", () => {
    const r = decideChange({
      pending: pendingEdit,
      decision: "reject",
      actorId: "rosa",
    });
    expect(r.ok && !r.value.apply && r.value.pendingStatus === "rejected").toBe(
      true,
    );
  });
  it("THE trust rule: proposer cannot approve their own change", () => {
    const r = decideChange({
      pending: pendingEdit,
      decision: "approve",
      actorId: "ana",
    });
    expect(!r.ok && r.error.kind === "SelfApproval").toBe(true);
  });
  it("proposer cannot self-reject either (same rule)", () => {
    const r = decideChange({
      pending: pendingEdit,
      decision: "reject",
      actorId: "ana",
    });
    expect(!r.ok && r.error.kind === "SelfApproval").toBe(true);
  });
  it("deciding an already-decided change fails (idempotency guard)", () => {
    const r = decideChange({
      pending: { ...pendingEdit, status: "approved" },
      decision: "approve",
      actorId: "rosa",
    });
    expect(!r.ok && r.error.kind === "AlreadyDecided").toBe(true);
  });
  it("approving a void → void action", () => {
    const r = decideChange({
      pending: { ...pendingEdit, kind: "void", after: null },
      decision: "approve",
      actorId: "rosa",
    });
    expect(r.ok && r.value.apply && r.value.action.kind === "void").toBe(true);
  });
});

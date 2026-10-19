import { describe, expect, it } from "vitest";
import { ChangeProposal } from "@/backend/modules/movements/domain/change-proposal";
import type { MovementSnapshot } from "@/backend/modules/movements/domain/movement";
import { PendingChange } from "@/backend/modules/movements/domain/pending-change";
import type { PendingChangeSnapshot } from "@/backend/modules/movements/domain/pending-change-snapshot";

const snapshot: MovementSnapshot = {
  type: "contribute",
  amount: 5000,
  cost: null,
  concept: "aporte",
  date: "2026-07-09",
};
const edited: MovementSnapshot = { ...snapshot, amount: 4500 }; // S/45

const movement = { id: "mov-1", status: "active" as const, snapshot };

describe("ChangeProposal.propose", () => {
  it("edit: captures before/after, applies nothing", () => {
    const r = ChangeProposal.propose({
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
    const r = ChangeProposal.propose({
      movement,
      hasPendingChange: false,
      kind: "void",
      actorId: "ana",
    });
    expect(r.ok && r.value.after === null).toBe(true);
  });
  it("rejects a second change while one is pending", () => {
    const r = ChangeProposal.propose({
      movement,
      hasPendingChange: true,
      kind: "edit",
      after: edited,
      actorId: "ana",
    });
    expect(!r.ok && r.error.kind === "ChangeAlreadyPending").toBe(true);
  });
  it("rejects changes to a voided movement", () => {
    const r = ChangeProposal.propose({
      movement: { ...movement, status: "voided" },
      hasPendingChange: false,
      kind: "void",
      actorId: "ana",
    });
    expect(!r.ok && r.error.kind === "MovementVoided").toBe(true);
  });
  it("rejects an edit without new values", () => {
    const r = ChangeProposal.propose({
      movement,
      hasPendingChange: false,
      kind: "edit",
      actorId: "ana",
    });
    expect(!r.ok && r.error.kind === "MissingChanges").toBe(true);
  });
});

describe("PendingChange.decide", () => {
  const pendingEdit: PendingChangeSnapshot = {
    id: "pc-1",
    status: "pending",
    proposedBy: "ana",
    kind: "edit",
    after: edited,
  };

  it("partner approves an edit → apply new snapshot", () => {
    const r = PendingChange.restore(pendingEdit).decide("approve", "rosa");
    expect(r.ok).toBe(true);
    if (r.ok && r.value.apply && r.value.action.kind === "edit") {
      expect(r.value.action.newSnapshot.amount).toBe(4500);
      expect(r.value.pendingStatus).toBe("approved");
    } else {
      throw new Error("expected applied edit");
    }
  });
  it("partner rejects → nothing applies, original stands", () => {
    const r = PendingChange.restore(pendingEdit).decide("reject", "rosa");
    expect(r.ok && !r.value.apply && r.value.pendingStatus === "rejected").toBe(
      true,
    );
  });
  it("THE trust rule: proposer cannot approve their own change", () => {
    const r = PendingChange.restore(pendingEdit).decide("approve", "ana");
    expect(!r.ok && r.error.kind === "SelfApproval").toBe(true);
  });
  it("proposer cannot self-reject either (same rule)", () => {
    const r = PendingChange.restore(pendingEdit).decide("reject", "ana");
    expect(!r.ok && r.error.kind === "SelfApproval").toBe(true);
  });
  it("deciding an already-decided change fails (idempotency guard)", () => {
    const r = PendingChange.restore({
      ...pendingEdit,
      status: "approved",
    }).decide("approve", "rosa");
    expect(!r.ok && r.error.kind === "AlreadyDecided").toBe(true);
  });
  it("approving a void → void action", () => {
    const r = PendingChange.restore({
      ...pendingEdit,
      kind: "void",
      after: null,
    }).decide("approve", "rosa");
    expect(r.ok && r.value.apply && r.value.action.kind === "void").toBe(true);
  });
});

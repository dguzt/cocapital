import { describe, expect, it } from "vitest";
import { decideJoin, makeInviteCode, validateGroupName } from "./rules";

describe("makeInviteCode", () => {
  it("makes 8 chars from the unambiguous alphabet", () => {
    const code = makeInviteCode(
      new Uint8Array([0, 31, 62, 93, 124, 155, 186, 217]),
    );
    expect(code).toHaveLength(8);
    expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  });
  it("is deterministic for the same bytes", () => {
    const bytes = new Uint8Array([5, 10, 15, 20, 25, 30, 35, 40]);
    expect(makeInviteCode(bytes)).toBe(makeInviteCode(bytes));
  });
  it("rejection-samples the biased tail (bytes >= 248 skipped)", () => {
    // 8 rejected bytes then 8 usable ones → still a valid 8-char code.
    const bytes = new Uint8Array([
      248, 249, 250, 251, 252, 253, 254, 255, 0, 1, 2, 3, 4, 5, 6, 7,
    ]);
    const code = makeInviteCode(bytes);
    expect(code).toHaveLength(8);
    expect(code).toBe("ABCDEFGH"); // 0..7 map to the first 8 letters
  });
  it("throws if randomness runs out after rejections", () => {
    expect(() => makeInviteCode(new Uint8Array([248, 249, 250]))).toThrow();
  });
});

describe("validateGroupName", () => {
  it("trims and accepts", () => {
    const r = validateGroupName("  Inversiones DR  ");
    expect(r.ok && r.value === "Inversiones DR").toBe(true);
  });
  it.each(["", "   ", "x".repeat(41)])("rejects %j", (name) => {
    const r = validateGroupName(name);
    expect(!r.ok && r.error.kind === "InvalidGroupName").toBe(true);
  });
});

describe("decideJoin (UC-103)", () => {
  const group = { id: "g1" };
  const base = {
    group,
    code: "ABCD2345",
    memberCount: 1,
    isMember: false,
    memberOfOtherGroup: false,
  };

  it("second partner joins a 1/2 group", () => {
    const r = decideJoin(base);
    expect(r.ok && r.value.action === "join").toBe(true);
  });
  it("unknown code → InviteNotFound", () => {
    const r = decideJoin({ ...base, group: null });
    expect(!r.ok && r.error.kind === "InviteNotFound").toBe(true);
  });
  it("full group (2/2) → GroupFull, link is dead (A-5)", () => {
    const r = decideJoin({ ...base, memberCount: 2 });
    expect(!r.ok && r.error.kind === "GroupFull").toBe(true);
  });
  it("existing member re-opens the link → idempotent, no error", () => {
    const r = decideJoin({ ...base, memberCount: 2, isMember: true });
    expect(r.ok && r.value.action === "already-member").toBe(true);
  });
  it("member of another group → AlreadyInGroup (one group per account)", () => {
    const r = decideJoin({ ...base, memberOfOtherGroup: true });
    expect(!r.ok && r.error.kind === "AlreadyInGroup").toBe(true);
  });
});

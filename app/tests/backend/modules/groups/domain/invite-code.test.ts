import { describe, expect, it } from "vitest";

import { InviteCode } from "@/backend/modules/groups/domain/invite-code";

describe("InviteCode", () => {
  it("generates 8 characters from the unambiguous alphabet", () => {
    const code = InviteCode.generate(
      new Uint8Array([0, 31, 62, 93, 124, 155, 186, 217]),
    );

    expect(code.value).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
  });

  it("generates the same code from the same bytes", () => {
    const bytes = new Uint8Array([5, 10, 15, 20, 25, 30, 35, 40]);

    expect(InviteCode.generate(bytes).value).toBe(
      InviteCode.generate(bytes).value,
    );
  });

  it("generates a fresh code each time without fixed bytes", () => {
    expect(InviteCode.generate().value).toHaveLength(InviteCode.LENGTH);
  });

  it("reads a typed code trimmed and in upper case", () => {
    expect(InviteCode.from("  abcd2345 ").value).toBe("ABCD2345");
  });
});

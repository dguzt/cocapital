/**
 * The invite code is the only door into a group. It must match exactly (no
 * prefix or pattern match), be drawn from a cryptographic source with enough
 * room to make guessing hopeless, and a seat must exist before it is taken.
 */
import { seedTenants } from "@tests/security/tenancy/support/seed";
import { joinGroup } from "@tests/support/use-cases";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/backend/infra/db/client";
import { Groups } from "@/backend/infra/db/schema";
import { InviteCode } from "@/backend/modules/groups/domain/invite-code";
import { truncateAll } from "@/test/truncate";

beforeEach(truncateAll);

describe("joining a group", () => {
  it("needs the whole code; a prefix, a wildcard or a near miss finds nothing", async () => {
    const t = await seedTenants();
    const code = t.groupB.inviteCode.value;

    for (const attempt of [
      code.slice(0, 7),
      `${code.slice(0, 7)}%`,
      `${code.slice(0, 7)}_`,
      "%",
      "",
      `${code}X`,
      `' OR '1'='1`,
    ]) {
      const result = await joinGroup(t.outsider, attempt);

      expect(result.ok, attempt).toBe(false);
    }
  });

  it("gives the same answer for a wrong code whatever groups exist", async () => {
    const t = await seedTenants();

    const near = await joinGroup(t.outsider, `${t.groupB.inviteCode.value}X`);
    const far = await joinGroup(t.outsider, "ZZZZZZZZ");

    expect(near.ok || near.error.kind).toBe("InviteNotFound");
    expect(far.ok || far.error.kind).toBe("InviteNotFound");
  });

  it("every group gets its own code, all of them 8 characters of the alphabet", async () => {
    await seedTenants();

    const codes = (await db.select().from(Groups)).map((row) => row.inviteCode);

    expect(new Set(codes).size).toBe(codes.length);

    for (const code of codes) {
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    }
  });

  it("draws codes with more than 10^11 possibilities and no repeats in 20k draws", () => {
    const space = 31 ** InviteCode.LENGTH;

    expect(space).toBeGreaterThan(1e11);

    const drawn = new Set(
      Array.from({ length: 20_000 }, () => InviteCode.generate().value),
    );

    expect(drawn.size).toBe(20_000);
  });
});

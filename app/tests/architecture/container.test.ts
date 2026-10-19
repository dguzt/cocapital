import { describe, expect, it } from "vitest";

process.env.DATABASE_URL ??= "postgres://user:pass@localhost:5432/unused";

const REQUEST_STATE = /^(groupId|userId|actorId|authId|user|group)$/;

describe("the container", () => {
  it("builds use cases that hold only collaborators, never request data", async () => {
    const { useCases } = await import("@/backend/application/container");

    const fields = Object.entries(useCases).flatMap(([useCase, instance]) =>
      Object.entries(instance as object).map(([name, value]) => ({
        useCase,
        name,
        kind: typeof value,
      })),
    );

    const offenders = fields.filter(
      (field) => REQUEST_STATE.test(field.name) || field.kind !== "object",
    );

    expect(fields.length).toBeGreaterThan(0);
    expect(offenders).toEqual([]);
  });
});

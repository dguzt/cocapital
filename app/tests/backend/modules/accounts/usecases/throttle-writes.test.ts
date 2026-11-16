import { describe, expect, it } from "vitest";

import type { RateLimiter } from "@/backend/modules/accounts/ports/rate-limiter";
import { ThrottleWrites } from "@/backend/modules/accounts/usecases/throttle-writes";

const MINUTE = 60;
const DAY = 86_400;

class FakeRateLimiter implements RateLimiter {
  readonly keys: string[] = [];

  constructor(private readonly hits: { minute: number; day: number }) {}

  async hit(input: { key: string; windowsInSeconds: readonly number[] }) {
    this.keys.push(input.key);

    return new Map([
      [MINUTE, this.hits.minute],
      [DAY, this.hits.day],
    ]);
  }
}

const throttle = (hits: { minute: number; day: number }) => {
  const limiter = new FakeRateLimiter(hits);

  return { limiter, useCase: new ThrottleWrites(limiter) };
};

describe("ThrottleWrites", () => {
  it("lets a write through up to 60 in a minute and 1000 in a day", async () => {
    const { useCase } = throttle({ minute: 60, day: 1_000 });

    const result = await useCase.execute({ userId: "u1" });

    expect(result.ok).toBe(true);
  });

  it("holds back the 61st write of a minute", async () => {
    const { useCase } = throttle({ minute: 61, day: 61 });

    const result = await useCase.execute({ userId: "u1" });

    expect(result).toMatchObject({
      ok: false,
      error: { kind: "RateLimited", userId: "u1", windowSeconds: MINUTE },
    });
  });

  it("holds back the 1001st write of a day, however slow", async () => {
    const { useCase } = throttle({ minute: 1, day: 1_001 });

    const result = await useCase.execute({ userId: "u1" });

    expect(result).toMatchObject({
      ok: false,
      error: { kind: "RateLimited", windowSeconds: DAY },
    });
  });

  it("counts each partner under their own key", async () => {
    const { limiter, useCase } = throttle({ minute: 1, day: 1 });

    await useCase.execute({ userId: "u1" });
    await useCase.execute({ userId: "u2" });

    expect(limiter.keys).toEqual(["writes:u1", "writes:u2"]);
  });
});

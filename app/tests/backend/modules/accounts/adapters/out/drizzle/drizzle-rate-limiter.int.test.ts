import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/backend/infra/db/client";
import { RateLimitWindows } from "@/backend/infra/db/schema";
import { DrizzleRateLimiter } from "@/backend/modules/accounts/adapters/out/drizzle/drizzle-rate-limiter";
import { truncateAll } from "@/test/truncate";

const limiter = new DrizzleRateLimiter(db);

const WINDOWS = [60, 86_400];

beforeEach(truncateAll);

describe("DrizzleRateLimiter", () => {
  it("counts every hit in each window", async () => {
    await limiter.hit({ key: "k", windowsInSeconds: WINDOWS });
    await limiter.hit({ key: "k", windowsInSeconds: WINDOWS });

    const hits = await limiter.hit({ key: "k", windowsInSeconds: WINDOWS });

    expect(hits).toEqual(
      new Map([
        [60, 3],
        [86_400, 3],
      ]),
    );
  });

  it("keeps each key apart", async () => {
    await limiter.hit({ key: "a", windowsInSeconds: WINDOWS });

    const hits = await limiter.hit({ key: "b", windowsInSeconds: WINDOWS });

    expect(hits.get(60)).toBe(1);
  });

  it("counts hits that race each other without losing one", async () => {
    await Promise.all(
      Array.from({ length: 10 }, () =>
        limiter.hit({ key: "k", windowsInSeconds: WINDOWS }),
      ),
    );

    const hits = await limiter.hit({ key: "k", windowsInSeconds: WINDOWS });

    expect(hits.get(86_400)).toBe(11);
  });

  it("drops the key's windows that already ended", async () => {
    await db.insert(RateLimitWindows).values({
      key: "k",
      windowSeconds: 60,
      windowStart: sql`now() - interval '2 days'`,
      hits: 5,
    });

    await limiter.hit({ key: "k", windowsInSeconds: WINDOWS });

    const rows = await db.select().from(RateLimitWindows);

    expect(rows.map((row) => row.hits)).toEqual([1, 1]);
  });
});

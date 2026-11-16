import { sql } from "drizzle-orm";

import type { Database } from "@/backend/infra/db/client";
import type { RateLimiter } from "@/backend/modules/accounts/ports/rate-limiter";

type WindowHitsRow = {
  window_seconds: number;
  hits: number;
};

export class DrizzleRateLimiter implements RateLimiter {
  static inject = ["db"] as const;

  constructor(private readonly db: Database) {}

  async hit(input: {
    key: string;
    windowsInSeconds: readonly number[];
  }): Promise<ReadonlyMap<number, number>> {
    const windows = sql.join(
      input.windowsInSeconds.map(
        (seconds) =>
          sql`(${input.key}, ${seconds}::int, to_timestamp(floor(extract(epoch from now()) / ${seconds}::int) * ${seconds}::int), 1)`,
      ),
      sql`, `,
    );

    const result = await this.db.execute<WindowHitsRow>(sql`
      with expired as (
        delete from rate_limit_windows
        where key = ${input.key}
          and window_start < now() - make_interval(secs => window_seconds)
      )
      insert into rate_limit_windows (key, window_seconds, window_start, hits)
      values ${windows}
      on conflict (key, window_seconds, window_start)
        do update set hits = rate_limit_windows.hits + 1
      returning window_seconds, hits
    `);

    return new Map(
      result.rows.map((row) => [Number(row.window_seconds), Number(row.hits)]),
    );
  }
}

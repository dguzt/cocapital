import { db } from "@/backend/infra/db/client";

type PgClient = { query: (...args: unknown[]) => unknown; __counted?: boolean };

type PgPool = {
  connect: (...args: unknown[]) => unknown;
  __counted?: boolean;
};

let sink: string[] | null = null;

const textOf = (first: unknown) =>
  typeof first === "string" ? first : (first as { text: string }).text;

function count(client: PgClient) {
  if (client.__counted) {
    return;
  }

  client.__counted = true;

  const original = client.query.bind(client);

  client.query = (...args: unknown[]) => {
    sink?.push(textOf(args[0]));
    return original(...args);
  };
}

function install(pool: PgPool) {
  if (pool.__counted) {
    return;
  }

  pool.__counted = true;

  const original = pool.connect.bind(pool);

  pool.connect = (...args: unknown[]) => {
    const [callback] = args;

    if (typeof callback === "function") {
      return original((error: unknown, client: PgClient, done: unknown) => {
        if (client) {
          count(client);
        }

        callback(error, client, done);
      });
    }

    return (original() as Promise<PgClient>).then((client) => {
      count(client);
      return client;
    });
  };
}

/** Runs `work` and returns every SQL text sent to the database while it ran. */
export async function recordQueries<T>(
  work: () => Promise<T>,
): Promise<{ result: T; sql: string[] }> {
  install((db as unknown as { $client: PgPool }).$client);

  const recorded: string[] = [];
  sink = recorded;

  try {
    const result = await work();

    return { result, sql: recorded };
  } finally {
    sink = null;
  }
}

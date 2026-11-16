/**
 * The proxy must ask Clerk to protect every route except the landing, the
 * link-preview card and the sign-in/up screens.
 */
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", async (importOriginal) => {
  const real = await importOriginal<typeof import("@clerk/nextjs/server")>();

  return {
    ...real,
    clerkMiddleware: (handler: unknown) => handler,
  };
});

type Handler = (
  auth: { protect: () => Promise<void> },
  req: NextRequest,
) => Promise<unknown>;

async function protects(path: string): Promise<boolean> {
  const { default: proxy } = await import("@/proxy");

  const protect = vi.fn(async () => {});

  await (proxy as unknown as Handler)(
    { protect },
    new NextRequest(new URL(path, "https://cocapital.test")),
  );

  return protect.mock.calls.length > 0;
}

describe("proxy", () => {
  it.each([
    "/g/0b9e7c1e-0000-4000-8000-000000000000",
    "/g/0b9e7c1e-0000-4000-8000-000000000000/prestamos/x",
    "/g/0b9e7c1e-0000-4000-8000-000000000000/actividad",
    "/join/ABCDEFGH",
    "/grupos/nuevo",
    "/api/anything",
    "/og",
    "/ogx/es",
    "/sign-in-but-not/../g/x",
    "/%2Fg/x",
  ])("protects %s", async (path) => {
    expect(await protects(path)).toBe(true);
  });

  it.each(["/", "/og/es", "/og/en", "/sign-in", "/sign-up/verify"])(
    "leaves %s public",
    async (path) => {
      expect(await protects(path)).toBe(false);
    },
  );
});

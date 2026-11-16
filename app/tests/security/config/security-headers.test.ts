import { describe, expect, it } from "vitest";

import nextConfig from "@/../next.config";

const REQUIRED = [
  "content-security-policy",
  "x-content-type-options",
  "referrer-policy",
] as const;

describe("security headers (next.config)", () => {
  it("does not advertise the framework", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("sends the baseline security headers on every route", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const all = rules.flatMap((rule) =>
      rule.headers.map((h) => h.key.toLowerCase()),
    );

    for (const header of REQUIRED) {
      expect(all, `missing ${header}`).toContain(header);
    }
  });

  it("forbids framing by other origins", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const flat = rules.flatMap((rule) => rule.headers);
    const csp = flat.find(
      (h) => h.key.toLowerCase() === "content-security-policy",
    );
    const xfo = flat.find((h) => h.key.toLowerCase() === "x-frame-options");

    expect(Boolean(xfo) || /frame-ancestors/.test(csp?.value ?? "")).toBe(true);
  });
});

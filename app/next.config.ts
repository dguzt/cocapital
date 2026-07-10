import type { NextConfig } from "next";

/**
 * Security M1: baseline response headers (defense-in-depth for a money app).
 * `frame-ancestors 'none'` + X-Frame-Options: DENY block the clickjacking
 * threat on the approval UI (an attacker iframing the dashboard to trick a
 * partner into approving a movement). A full script-src CSP is intentionally
 * left as a follow-up — it must allow-list the Clerk frontend-API origin
 * (which differs between the dev and prod Clerk instances) and be verified
 * end-to-end before shipping, to avoid breaking auth.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;

import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });

const PORT = 3210;

const server = process.env.E2E_PRODUCTION_BUILD
  ? `next build && next start --port ${PORT}`
  : `next dev --port ${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "tests/e2e/support/global-setup.ts",

  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    ...devices["Pixel 7"],
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },

  webServer: {
    command: server,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL_TEST ?? "",
    },
  },
});

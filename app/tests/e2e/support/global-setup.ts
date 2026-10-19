import { clerkSetup } from "@clerk/testing/playwright";

/** Vacía la rama Neon `test` y obtiene el testing token de Clerk antes de la corrida. */
export default async function globalSetup() {
  const testUrl = process.env.DATABASE_URL_TEST;

  if (!testUrl) {
    throw new Error(
      "DATABASE_URL_TEST is not set — E2E runs only on the Neon 'test' branch.",
    );
  }

  process.env.DATABASE_URL = testUrl;

  const { truncateAll } = await import("../../../src/test/truncate");

  await truncateAll();
  await clerkSetup();
}

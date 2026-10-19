import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Integration suite: real Neon test branch, sequential (shared DB state). */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@tests": fileURLToPath(new URL("./tests", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.int.test.ts"],
    setupFiles: ["src/test/integration-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
  },
});

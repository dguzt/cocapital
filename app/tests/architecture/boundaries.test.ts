import { projectFiles } from "archunit";
import { describe, expect, it } from "vitest";

const MODULES = [
  "accounts",
  "capital",
  "contacts",
  "groups",
  "inventory",
  "loans",
  "movements",
];

const TIMEOUT = 60_000;

/** Files of other modules than `module` inside one of their layers. */
function otherModules(module: string, layer: string): RegExp {
  return new RegExp(`src/backend/modules/(?!${module}/)[^/]+/${layer}/`);
}

describe("hexagonal layers", () => {
  it(
    "the domain depends on nothing but the domain",
    async () => {
      const violations = await projectFiles()
        .inPath("src/backend/modules/*/domain/**")
        .shouldNot()
        .dependOnFiles()
        .inPath(
          /src\/backend\/(application|infra|modules\/[^/]+\/(ports|usecases|adapters))\//,
        )
        .check();

      expect(violations).toEqual([]);
    },
    TIMEOUT,
  );

  it(
    "ports and use cases never reach adapters, infrastructure or the container",
    async () => {
      const violations = await projectFiles()
        .inPath(/src\/backend\/modules\/[^/]+\/(ports|usecases)\//)
        .shouldNot()
        .dependOnFiles()
        .inPath(/src\/backend\/(application|infra|modules\/[^/]+\/adapters)\//)
        .check();

      expect(violations).toEqual([]);
    },
    TIMEOUT,
  );

  it.each(MODULES)(
    "use cases of %s talk to other modules only through their use cases",
    async (module) => {
      const violations = await projectFiles()
        .inPath(`src/backend/modules/${module}/usecases/**`)
        .shouldNot()
        .dependOnFiles()
        .inPath(otherModules(module, "ports"))
        .check({ allowEmptyTests: true });

      expect(violations).toEqual([]);
    },
    TIMEOUT,
  );
});

describe("module boundaries", () => {
  it(
    "the ledger never learns about loans or inventory",
    async () => {
      const violations = await projectFiles()
        .inPath("src/backend/modules/movements/**")
        .shouldNot()
        .dependOnFiles()
        .inPath(/src\/backend\/modules\/(loans|inventory|capital)\//)
        .check();

      expect(violations).toEqual([]);
    },
    TIMEOUT,
  );

  it(
    "the backend has no dependency cycles",
    async () => {
      const violations = await projectFiles()
        .inPath("src/backend/**")
        .should()
        .haveNoCycles()
        .check();

      expect(violations).toEqual([]);
    },
    TIMEOUT,
  );
});

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { moduleSpecifiersOf } from "./npm-node.js";
import { NodePackageResolver } from "./npm.js";

const fixturesRoot = fileURLToPath(new URL("../../../../tests/fixtures/npm/", import.meta.url));
const fixture = (...parts: string[]): string => join(fixturesRoot, ...parts);
const portable = (path: string): string => path.replaceAll("\\", "/");

test("collects import.meta.resolve literals as resolution-only edges", () => {
  const result = moduleSpecifiersOf(
    'export const relative = import.meta.resolve("./asset.js");\n' +
      'export const packageUrl = import.meta.resolve("example-package");\n',
    "/project/index.mjs",
  );
  expect(result.uses).toEqual([
    {
      specifier: "./asset.js",
      static: false,
      require: false,
      requireLocal: false,
      requireViaHelper: false,
      dynamicImport: false,
      importMetaResolve: true,
    },
    {
      specifier: "example-package",
      static: false,
      require: false,
      requireLocal: false,
      requireViaHelper: false,
      dynamicImport: false,
      importMetaResolve: true,
    },
  ]);
});

test("runtime introspection keeps import and require export conditions separate", () => {
  const entry = fixture("cases", "dual-entry", "main.ts");
  const builder = new NodePackageResolver();
  const imported = builder.resolveForIntrospection(entry, "dual", "import");
  const required = builder.resolveForIntrospection(entry, "dual", "require");
  expect(imported).not.toBeNull();
  expect(required).not.toBeNull();
  if (imported === null || required === null) return;
  expect(portable(imported)).toMatch(/\/dual\/index\.mjs$/);
  expect(portable(required)).toMatch(/\/dual\/index\.cjs$/);
});

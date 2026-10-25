import { afterAll, expect, test } from "vitest";
import { moduleSpecifiersOfFile, sourceImportsOfFile, type SpecifierUse } from "./module-syntax.js";
import { closeSourceParser, parseSourceFile } from "./ts7/source-parser-node.js";

afterAll(closeSourceParser);

function scan(source: string) {
  return moduleSpecifiersOfFile(parseSourceFile("scan.ts", source, "ts"));
}

function edge(specifier: string, flags: Partial<SpecifierUse> = {}): SpecifierUse {
  return {
    specifier,
    static: false,
    require: false,
    requireLocal: false,
    requireViaHelper: false,
    dynamicImport: false,
    importMetaResolve: false,
    ...flags,
  };
}

test("module edges preserve encounter order and merge all literal call forms", () => {
  const result = scan(`import "first";
    export * as namespace from "namespace";
    require("mixed"); import("mixed"); export { name } from "mixed";
    import.meta.resolve("mixed");
    import(\`template\`, { with: { type: "json" } });
    import.meta.resolve(\`resolve-only\`);
    function nested() { return require("nested"); }
    require("ignored", extra); require(variable); import(variable);
    import.meta.other("ignored"); object.require("ignored");`);
  expect(result).toEqual({
    uses: [
      edge("first", { static: true }),
      edge("namespace", { static: true }),
      edge("mixed", {
        static: true,
        require: true,
        requireLocal: true,
        dynamicImport: true,
        importMetaResolve: true,
      }),
      edge("template", { dynamicImport: true }),
      edge("resolve-only", { importMetaResolve: true }),
      edge("nested", { require: true, requireLocal: true }),
    ],
    requireHelperImport: null,
    requireHelperReexport: null,
  });
});

test("helper calls attribute to imported bindings even when the import follows the call", () => {
  const result = scan(`__require("shared"); require("shared");
    import { helper as __require } from "./helper.js";
    export { __require as routed } from "./hop.js";`);
  expect(result.requireHelperImport).toBe("./helper.js");
  expect(result.requireHelperReexport).toBe("./hop.js");
  expect(result.uses[0]).toEqual(
    edge("shared", { require: true, requireLocal: true, requireViaHelper: true }),
  );
  expect(scan('const __require = require; __require("local");').uses).toEqual([
    edge("local", { require: true, requireLocal: true }),
  ]);
  expect(
    scan('import { __require as renamed } from "./helper.js"; __require("local");')
      .requireHelperImport,
  ).toBeNull();
});

test("CommonJS module.require literals are local lazy edges", () => {
  expect(
    scan(`module.require("./method-only.cjs");
    module["require"](\`./computed.cjs\`);
    module.require(variable); module.require("ignored", extra);
    object.require("ignored"); module[variable]("ignored");
    require("./method-only.cjs");`).uses,
  ).toEqual([
    edge("./method-only.cjs", { require: true, requireLocal: true }),
    edge("./computed.cjs", { require: true, requireLocal: true }),
  ]);
});

test("comments, strings, regexes and substituted template literals cannot invent edges", () => {
  const source = `
    // require("comment")
    /* export * from "comment" */
    const text = 'import("text")';
    const regex = /require\\("regex"\\)/;
    require(\`prefix-\${value}\`);
    import(\`prefix-\${value}\`);
    import.meta.resolve(\`prefix-\${value}\`);
    import("real");
  `;
  expect(scan(source).uses).toEqual([edge("real", { dynamicImport: true })]);
});

test("source prescan preserves declaration type-only flags and repeated edges", () => {
  const file = parseSourceFile(
    "types.ts",
    `import type { Shape } from "types";
    export type { Other } from "other-types";
    import { type Inline, value } from "mixed";
    import "side-effect";
    export * from "runtime";
    require("runtime"); import("runtime", { with: { type: "json" } });
    __require("helper-only"); import.meta.resolve("resolve-only");`,
    "ts",
  );
  expect(sourceImportsOfFile(file)).toEqual([
    { spec: "types", typeOnly: true },
    { spec: "other-types", typeOnly: true },
    { spec: "mixed", typeOnly: false },
    { spec: "side-effect", typeOnly: false },
    { spec: "runtime", typeOnly: false },
    { spec: "runtime", typeOnly: false },
    { spec: "runtime", typeOnly: false },
  ]);
});

test("deep expression traversal finds nested imports without recursive JavaScript walking", () => {
  const source = "const value = " + "x + ".repeat(4000) + 'require("deep");';
  expect(scan(source).uses).toEqual([edge("deep", { require: true, requireLocal: true })]);
});

test("scanning successive versions never reuses stale edges", () => {
  expect(scan('import "before";').uses.map((use) => use.specifier)).toEqual(["before"]);
  expect(scan("").uses).toEqual([]);
  expect(scan('export * from "after";').uses.map((use) => use.specifier)).toEqual(["after"]);
});

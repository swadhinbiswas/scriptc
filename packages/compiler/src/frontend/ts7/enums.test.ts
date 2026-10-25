import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { expect, test } from "vitest";
import * as generated from "./enums.js";
import { AstKind, AstModifierFlags, AstNodeFlags } from "./ast-schema.generated.js";
import * as semantic from "./semantic-schema.generated.js";

const require = createRequire(import.meta.url);
const packageRoot = dirname(require.resolve("typescript/package.json"));

test("owned enums exactly match the pinned SDK, including duplicate reverse names", () => {
  for (const [name, value] of Object.entries(generated)) {
    if (typeof value === "function") continue;
    const basename = name[0]!.toLowerCase() + name.slice(1);
    const upstream = require(join(packageRoot, "dist/enums", `${basename}.js`)) as Record<
      string,
      unknown
    >;
    expect(value, name).toEqual(upstream[name]);
  }
});

test("runtime name lookups preserve aliases and missing values", () => {
  for (const [values, lookup] of [
    [generated.SyntaxKind, generated.syntaxKindName],
    [generated.ScriptTarget, generated.scriptTargetName],
    [generated.ModuleKind, generated.moduleKindName],
    [generated.ModuleResolutionKind, generated.moduleResolutionKindName],
    [generated.ModuleDetectionKind, generated.moduleDetectionKindName],
  ] as const) {
    for (const key of Object.keys(values)) {
      const numeric = Number(key);
      if (Number.isFinite(numeric)) expect(lookup(numeric)).toBe(values[numeric]);
    }
    for (const missing of [-100, 0.5, 65536, NaN, Infinity, -Infinity]) {
      expect(lookup(missing)).toBeUndefined();
    }
  }
  expect(generated.scriptTargetName(generated.ScriptTarget.ESNext)).toBe("Latest");
});

test("frontend enums and wire discriminants remain in the same TypeScript world", () => {
  for (const [wire, frontend] of [
    [AstKind, generated.SyntaxKind],
    [AstNodeFlags, generated.NodeFlags],
    [AstModifierFlags, generated.ModifierFlags],
    [semantic.SemanticTypeFlags, generated.TypeFlags],
    [semantic.SemanticObjectFlags, generated.ObjectFlags],
    [semantic.SemanticSymbolFlags, generated.SymbolFlags],
    [semantic.SemanticSignatureFlags, generated.SignatureFlags],
    [semantic.SemanticSignatureKind, generated.SignatureKind],
    [semantic.SemanticTypePredicateKind, generated.TypePredicateKind],
  ] as const) {
    for (const [name, value] of Object.entries(wire))
      expect((frontend as Record<string, string | number>)[name], name).toBe(value);
  }
});

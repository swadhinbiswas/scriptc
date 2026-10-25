/* Census VALUE coverage: every runtime name the census uses must exist on
 * the adapter with the right typeof — enums as objects with the symbolic
 * keys the frontend reads, helpers and guards as functions. The deferred
 * list (the survey's MISSING dispositions that stay in the 5.9.3 islands)
 * is pinned too: if a later tsgo release grows one of them, this says so. */

import { expect, test } from "vitest";
import { ad } from "./harness.js";
import { createProgram } from "../../src/frontend/ts7/program-adapter.js";

const VALUE_FUNCTIONS = [
  // pure-AST helpers and program surface
  "forEachChild",
  "getModifiers",
  "canHaveModifiers",
  "getCombinedNodeFlags",
  "getCombinedModifierFlags",
  "getLineAndCharacterOfPosition",
  "flattenDiagnosticMessageText",
  "tokenToString",
  "isExternalModule",
  "getPreEmitDiagnostics",
  "findConfigFile",
  // the renamed guards under their census names
  "isParameter",
  "isPropertySignature",
  "isStringLiteralLike",
  "isFunctionLike",
  "isGetAccessor",
  "isSetAccessor",
  "isAccessor",
] as const;

const ENUMS: [name: string, keys: string[]][] = [
  [
    "SyntaxKind",
    [
      "Identifier",
      "CallExpression",
      "TrueKeyword",
      "FalseKeyword",
      "NullKeyword",
      "DefaultKeyword",
      "EqualsToken",
      "SourceFile",
    ],
  ],
  [
    "TypeFlags",
    [
      "String",
      "Number",
      "Boolean",
      "Undefined",
      "Null",
      "Object",
      "Union",
      "StringLiteral",
      "NumberLiteral",
      "BooleanLiteral",
      "EnumLiteral",
      "Never",
      "Unknown",
      "Any",
      "BigInt",
      "ESSymbol",
      "TypeParameter",
      "Intersection",
      "IndexedAccess",
    ],
  ],
  ["NodeFlags", ["Const", "Let", "None"]],
  [
    "SymbolFlags",
    [
      "Alias",
      "Function",
      "Class",
      "Interface",
      "TypeAlias",
      "Variable",
      "Property",
      "Method",
      "EnumMember",
      "BlockScopedVariable",
    ],
  ],
  [
    "ModifierFlags",
    [
      "Export",
      "Default",
      "Async",
      "Static",
      "Readonly",
      "Abstract",
      "Ambient",
      "Private",
      "Protected",
      "Public",
    ],
  ],
  ["ObjectFlags", ["Reference", "Tuple", "Anonymous", "Class", "Interface"]],
  ["ElementFlags", ["Required", "Optional", "Rest", "Variadic"]],
  ["ModuleKind", ["ESNext", "CommonJS", "NodeNext", "Preserve"]],
  ["ModuleResolutionKind", ["Bundler", "Node16", "NodeNext"]],
  ["ScriptTarget", ["ESNext", "ES2023"]],
  ["ScriptKind", ["TS", "JS", "JSON"]],
  ["DiagnosticCategory", ["Error", "Warning", "Suggestion", "Message"]],
];

/* The survey's MISSING list that stays outside the adapter — the adapter
 * must NOT grow look-alikes without updating this list. Source parsing/transpilation remains
 * in the allowlisted TypeScript 5 islands; resolution and config parsing use
 * scriptc's resolver and the TypeScript 7 host instead. */
const DEFERRED = [
  "createSourceFile",
  "preProcessFile",
  "transpileModule",
  "resolveModuleName",
  "resolveTypeReferenceDirective",
  "readConfigFile",
  "parseJsonConfigFileContent",
] as const;

test("every census value function is exported and callable", () => {
  const surface = ad as never as Record<string, unknown>;
  for (const name of VALUE_FUNCTIONS) {
    expect(typeof surface[name], name).toBe("function");
  }
  expect(typeof ad.sys.fileExists).toBe("function");
  expect(typeof ad.sys.readFile).toBe("function");
  expect(typeof ad.sys.directoryExists).toBe("function");
});

test("Node program construction stays in its explicit host entry", () => {
  expect(createProgram).toBeTypeOf("function");
  expect("createProgram" in ad).toBe(false);
  expect(ad.Ts7Host.prototype.createProgram).toBeTypeOf("function");
});

test("every census enum re-exports with its symbolic keys", () => {
  const surface = ad as never as Record<string, Record<string, unknown>>;
  for (const [name, keys] of ENUMS) {
    const enumObject = surface[name];
    expect(enumObject, name).toBeTypeOf("object");
    for (const key of keys) {
      expect(typeof enumObject![key], `${name}.${key}`).toBe("number");
    }
  }
  // InternalSymbolName is string-valued, checked apart from the numerics.
  expect(typeof ad.InternalSymbolName.Default).toBe("string");
  expect(typeof ad.InternalSymbolName.ExportEquals).toBe("string");
});

test("the deferred island surface stays deferred (documented, not shimmed)", () => {
  const surface = ad as never as Record<string, unknown>;
  for (const name of DEFERRED) {
    expect(surface[name], name).toBeUndefined();
  }
});

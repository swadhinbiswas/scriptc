import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, expect, test } from "vitest";
import type { SourceFile } from "./ast-types.js";
import {
  reusedLibDiagnostics,
  setLibDiagnosticsStore,
  type LibDiagnosticsStore,
} from "./lib-diagnostics.js";
import type { Ts7DiagnosticData } from "./session-schema.generated.js";
import type { Ts7CheckedFileDiagnosticData, Ts7SessionProgram } from "./session.js";
import { closeSourceParser, parseSourceFile } from "./source-parser-node.js";

const dir = mkdtempSync(join(tmpdir(), "scriptc-lib-diagnostics-"));
const lib = join(dir, "lib.es5.d.ts");
const fallback = join(dir, "scriptc-node-fallback.d.ts");
const libText = "declare var NaN: number;\ninterface Array<T> { length: number }\n";
const fallbackText = "export {};\ndeclare global {\n  var process: { argv: string[] };\n}\n";
writeFileSync(lib, libText);
writeFileSync(fallback, fallbackText);
const main = join(dir, "main.ts");
const util = join(dir, "\u{1F600}.ts");
const other = join(dir, "�.ts");

afterEach(() => setLibDiagnosticsStore(null));
afterAll(() => {
  closeSourceParser();
  rmSync(dir, { recursive: true, force: true });
});

function memoryStore(): LibDiagnosticsStore & { entries: Map<string, string> } {
  const entries = new Map<string, string>();
  return {
    entries,
    read: (key) => entries.get(key) ?? null,
    write: (key, text) => void entries.set(key, text),
  };
}

function diagnostic(fileName: string | undefined, pos: number, code = 2322): Ts7DiagnosticData {
  return { fileName, pos, end: pos + 1, code, category: 1, text: `at ${pos}` };
}

/** A session program whose full-check and checked-file answers are given; it
 * records which requests it was asked. */
function sessionProgram(answers: {
  semantic: Map<string, Ts7DiagnosticData[]>;
  global?: Ts7DiagnosticData[];
  checked?: boolean;
}): Ts7SessionProgram & { asked: string[] } {
  const asked: string[] = [];
  const all = [...answers.semantic.values()].flat();
  return {
    asked,
    getCompilerOptions: () => ({ strict: true }),
    diagnosticData: (method: string, file?: string) => {
      asked.push(file === undefined ? method : `${method} ${file}`);
      if (method === "getGlobalDiagnostics") return answers.global ?? [];
      return file === undefined ? all : (answers.semantic.get(file) ?? []);
    },
    checkedFileDiagnosticData: (files: readonly string[]): Ts7CheckedFileDiagnosticData | null => {
      asked.push(`checked ${files.join(",")}`);
      if (answers.checked === false) return null;
      return { files: files.map((file) => answers.semantic.get(file) ?? []), global: [] };
    },
  } as unknown as Ts7SessionProgram & { asked: string[] };
}

/** The program's files, parsed: the supplied two and the given others. */
function files(texts: Record<string, string>): (name: string) => SourceFile | undefined {
  const parsed = new Map<string, SourceFile>([
    [lib, parseSourceFile(lib, libText, "ts")],
    [fallback, parseSourceFile(fallback, fallbackText, "ts")],
  ]);
  for (const [name, text] of Object.entries(texts))
    parsed.set(name, parseSourceFile(name, text, "ts"));
  return (name) => parsed.get(name);
}

const names = [lib, fallback, main];
const supplied = (name: string): boolean => name === lib || name === fallback;
const moduleFile = files({ [main]: "export const n: number = 'x';\n" });

test("without a store the full check answers", () => {
  const program = sessionProgram({ semantic: new Map() });
  expect(reusedLibDiagnostics(program, names, supplied, moduleFile)).toBeNull();
  expect(program.asked).toEqual([]);
});

test("a stored answer stands in for checking the supplied files, merged by file name", () => {
  const store = memoryStore();
  setLibDiagnosticsStore(store, "checker");
  const semantic = new Map([
    [lib, [diagnostic(lib, 1)]],
    [fallback, []],
    [main, [diagnostic(main, 5), diagnostic(main, 9)]],
  ]);
  const first = sessionProgram({ semantic });
  const full = reusedLibDiagnostics(first, names, supplied, moduleFile);
  // The first build runs the full check and stores the supplied files' answers.
  expect(first.asked).toEqual([
    "getGlobalDiagnostics",
    "getSemanticDiagnostics",
    "checked ",
    `getSemanticDiagnostics ${lib}`,
    `getSemanticDiagnostics ${fallback}`,
  ]);
  expect(store.entries.size).toBe(1);
  const second = sessionProgram({ semantic });
  const reused = reusedLibDiagnostics(second, names, supplied, moduleFile);
  expect(second.asked).toEqual([`checked ${main}`]);
  // The files' diagnostics in the order of their names (lib.es5.d.ts, main.ts), as the full answer.
  expect(reused).toEqual({
    semantic: [diagnostic(lib, 1), diagnostic(main, 5), diagnostic(main, 9)],
    global: [],
  });
  expect(full?.semantic).toEqual(reused?.semantic);
});

test("files merge in code point order, which differs from UTF-16 order", () => {
  const store = memoryStore();
  setLibDiagnosticsStore(store, "checker");
  const all = [lib, fallback, util, other];
  const sources = files({ [util]: "export {};\n", [other]: "export {};\n" });
  const semantic = new Map([
    [util, [diagnostic(util, 1)]],
    [other, [diagnostic(other, 2)]],
  ]);
  reusedLibDiagnostics(sessionProgram({ semantic }), all, supplied, sources);
  const reused = reusedLibDiagnostics(sessionProgram({ semantic }), all, supplied, sources);
  // U+FFFD sorts before U+1F600 by code point (its surrogates sort after it by UTF-16 unit).
  expect(reused?.semantic).toEqual([diagnostic(other, 2), diagnostic(util, 1)]);
});

test("a full check with global diagnostics is not stored", () => {
  const store = memoryStore();
  setLibDiagnosticsStore(store, "checker");
  const program = sessionProgram({
    semantic: new Map([[main, [diagnostic(main, 1)]]]),
    global: [diagnostic(undefined, 0, 2318)],
  });
  expect(reusedLibDiagnostics(program, names, supplied, moduleFile)?.global).toEqual([
    diagnostic(undefined, 0, 2318),
  ]);
  expect(store.entries.size).toBe(0);
});

test("scripts reuse the answer unless they declare a global the supplied files declare", () => {
  const store = memoryStore();
  setLibDiagnosticsStore(store, "checker");
  const semantic = new Map([[main, []]]);
  // A script declaring only new names: it stores the answer, and a later one reuses it.
  const fresh = files({
    [main]: "const total = 1;\nfunction run() {}\nif (total) { var later = 2; }\n",
  });
  reusedLibDiagnostics(sessionProgram({ semantic }), names, supplied, fresh);
  expect(store.entries.size).toBe(1);
  const again = sessionProgram({ semantic });
  expect(reusedLibDiagnostics(again, names, supplied, fresh)).not.toBeNull();
  expect(again.asked).toEqual([`checked ${main}`]);
  // Scripts declaring a supplied global, at the top level, in a block, in a
  // `declare global` of a supplied module, or an ambient module: the full check.
  for (const text of [
    "interface Array<T> { extra: T }\n",
    "if (true) { var NaN = 1; }\n",
    "declare var process: unknown;\n",
    'declare module "fs" {}\n',
  ]) {
    const program = sessionProgram({ semantic });
    const result = reusedLibDiagnostics(program, names, supplied, files({ [main]: text }));
    expect(program.asked[0], text).not.toBe(`checked ${main}`);
    if (result !== null) expect(program.asked[0]).toBe("getGlobalDiagnostics");
  }
  expect(store.entries.size).toBe(1);
});

test("a program whose script declares a supplied global does not store its answer", () => {
  const store = memoryStore();
  setLibDiagnosticsStore(store, "checker");
  const program = sessionProgram({ semantic: new Map([[main, []]]) });
  reusedLibDiagnostics(program, names, supplied, files({ [main]: "declare var NaN: number;\n" }));
  expect(store.entries.size).toBe(0);
});

test("modules that can declare something global, and servers without the method, ask as before", () => {
  const store = memoryStore();
  setLibDiagnosticsStore(store, "checker");
  const semantic = new Map([[main, []]]);
  reusedLibDiagnostics(sessionProgram({ semantic }), names, supplied, moduleFile);
  expect(store.entries.size).toBe(1);
  for (const text of [
    "export {};\ndeclare global { var extra: number }\n",
    'export {};\ndeclare module "./other" { const extra: number }\n',
    "export as namespace Lib;\nexport const n = 1;\n",
  ]) {
    const program = sessionProgram({ semantic });
    expect(reusedLibDiagnostics(program, names, supplied, files({ [main]: text }))).toBeNull();
    expect(program.asked).toEqual([]);
  }
  const old = sessionProgram({ semantic, checked: false });
  expect(reusedLibDiagnostics(old, names, supplied, moduleFile)).toBeNull();
  // Nor does a server without the method store an answer it could not use.
  const fresh = memoryStore();
  setLibDiagnosticsStore(fresh, "checker");
  reusedLibDiagnostics(sessionProgram({ semantic, checked: false }), names, supplied, moduleFile);
  expect(fresh.entries.size).toBe(0);
});

test("a supplied file that changes is a different entry", () => {
  const store = memoryStore();
  setLibDiagnosticsStore(store, "checker");
  const semantic = new Map([[main, []]]);
  reusedLibDiagnostics(sessionProgram({ semantic }), names, supplied, moduleFile);
  writeFileSync(fallback, fallbackText + "// edited\n");
  const program = sessionProgram({ semantic });
  reusedLibDiagnostics(program, names, supplied, moduleFile);
  expect(program.asked[0]).toBe("getGlobalDiagnostics");
  expect(store.entries.size).toBe(2);
  writeFileSync(fallback, fallbackText);
});

/** The program's files, recording which ones were read. */
function recording(texts: Record<string, string>): ((name: string) => SourceFile | undefined) & {
  read: string[];
} {
  const inner = files(texts);
  const read: string[] = [];
  return Object.assign((name: string) => (read.push(name), inner(name)), { read });
}

test("a program of modules stores its answer without reading the supplied files", () => {
  const store = memoryStore();
  setLibDiagnosticsStore(store, "checker");
  const sources = recording({ [main]: "export const n: number = 'x';\n" });
  reusedLibDiagnostics(
    sessionProgram({ semantic: new Map([[main, []]]) }),
    names,
    supplied,
    sources,
  );
  expect(sources.read).toEqual([main]);
  const [text] = [...store.entries.values()];
  expect(JSON.parse(text!).globals).toBeNull();
  // A later program of modules reuses it, again without reading them.
  const again = recording({ [main]: "export const n: number = 'x';\n" });
  const program = sessionProgram({ semantic: new Map([[main, []]]) });
  expect(reusedLibDiagnostics(program, names, supplied, again)).not.toBeNull();
  expect(program.asked).toEqual([`checked ${main}`]);
  expect(again.read).toEqual([main]);
});

test("a script that uses an answer stored without global names collects and stores them", () => {
  const store = memoryStore();
  setLibDiagnosticsStore(store, "checker");
  const semantic = new Map([[main, []]]);
  reusedLibDiagnostics(sessionProgram({ semantic }), names, supplied, moduleFile);
  const script = recording({ [main]: "const total = 1;\n" });
  const program = sessionProgram({ semantic });
  expect(reusedLibDiagnostics(program, names, supplied, script)).not.toBeNull();
  expect(program.asked).toEqual([`checked ${main}`]);
  expect(script.read).toEqual([main, lib, fallback]);
  const [text] = [...store.entries.values()];
  expect(new Set(JSON.parse(text!).globals)).toEqual(new Set(["NaN", "Array", "process"]));
  // A script that declares one of them runs the full check, and the entry keeps its names.
  const clash = sessionProgram({ semantic });
  reusedLibDiagnostics(clash, names, supplied, files({ [main]: "declare var NaN: number;\n" }));
  expect(clash.asked[0]).toBe("getGlobalDiagnostics");
  expect(store.entries.size).toBe(1);
  expect(JSON.parse([...store.entries.values()][0]!).globals).not.toBeNull();
});

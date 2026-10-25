import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "vitest";
import { API } from "typescript/unstable/sync";
import { Ts7RpcClient } from "./rpc-client.js";
import {
  registerTs7FileSystem,
  TS7_FILE_SYSTEM_CALLBACKS,
  type Ts7FileSystem,
} from "./rpc-filesystem.js";
import { spawnTs7Wire } from "./rpc-process.js";
import { tsgoExecutable } from "./rpc-api.js";
import { Ts7Session, Ts7SessionProject, Ts7SessionSnapshot } from "./session.js";
import { AstNode } from "./ast-node.js";
import { ts7Diagnostic } from "./diagnostic.js";
import { getTextOfNode } from "./node-functions.js";

const tempRoot = process.platform === "win32" ? tmpdir() : "/tmp";
const protocolPath = (path: string) => path.replaceAll("\\", "/");
const fallback: Ts7FileSystem = {
  readFile: () => undefined,
  fileExists: () => undefined,
  directoryExists: () => undefined,
  realpath: () => undefined,
  getAccessibleEntries: () => undefined,
};

// These tests compare the session with the pinned SDK, which runs tsgo, so the session runs tsgo too.
function transport(cwd: string, fs: Ts7FileSystem = fallback, timing = false) {
  const rpc = new Ts7RpcClient(
    spawnTs7Wire(tsgoExecutable(), [
      "--api",
      "--cwd",
      cwd,
      `--callbacks=${TS7_FILE_SYSTEM_CALLBACKS}`,
      ...(timing ? ["--timing"] : []),
    ]),
  );
  registerTs7FileSystem(rpc, fs);
  return rpc;
}

function connect(cwd: string, fs: Ts7FileSystem = fallback, timing = false) {
  return new Ts7Session(transport(cwd, fs, timing), timing);
}

test("owned snapshots preserve SDK options, diagnostics, metadata and default-project lookup", () => {
  const dir = mkdtempSync(join(tempRoot, "scriptc-session-parity-"));
  const file = protocolPath(join(dir, "main.ts"));
  const config = protocolPath(join(dir, "tsconfig.json"));
  writeFileSync(file, 'export const answer: number = "wrong";\n');
  writeFileSync(
    config,
    JSON.stringify({
      compilerOptions: {
        strict: true,
        target: "esnext",
        types: [],
        declaration: true,
        sourceMap: true,
        paths: { "named/*": ["./*", "../*"] },
      },
      files: [file],
    }),
  );
  const session = connect(dir, fallback, true);
  const sdk = new API({ cwd: dir });
  try {
    expect(session.parseConfigFile(config)).toEqual(sdk.parseConfigFile(config));
    const snapshot = session.updateSnapshot({ openProjects: [config], openFiles: [file] });
    const oracle = sdk.updateSnapshot({ openProjects: [config], openFiles: [file] });
    expect(snapshot).toBeInstanceOf(Ts7SessionSnapshot);
    const project = snapshot.getProject(config)!;
    const expected = oracle.getProject(config)!;
    expect(project).toBeInstanceOf(Ts7SessionProject);
    expect(project.program.getCompilerOptions()).toEqual(expected.program.getCompilerOptions());
    expect(project.rootFiles).toEqual(expected.rootFiles);
    expect(snapshot.getDefaultProjectForFile(file)).toBe(project);
    expect(snapshot.getProject(protocolPath(join(dir, "./tsconfig.json")))).toBe(project);
    expect(project.program.getSourceFileNames()).toEqual(expected.program.getSourceFileNames());
    const source = project.program.getSourceFile(file)!;
    expect(source).toBeInstanceOf(AstNode);
    expect(source.text).toBe(expected.program.getSourceFile(file)!.text);
    const metadata = project.program.getSourceFileMetadata(file)!;
    expect(metadata).toEqual(expected.program.getSourceFileMetadata(file));
    expect(project.program.getSourceFileMetadata(file)).toBe(metadata);
    const missing = protocolPath(join(dir, "missing.ts"));
    expect(project.program.getSourceFile(missing)).toBeUndefined();
    const sourceRequests = session.getTimingInfo().totals.requestCount;
    expect(project.program.getSourceFile(file)).toBe(source);
    expect(project.program.getSourceFile({ uri: pathToFileURL(join(dir, "main.ts")).href })).toBe(
      source,
    );
    expect(project.program.getSourceFile(missing)).toBeUndefined();
    expect(session.getTimingInfo().totals.requestCount).toBe(sourceRequests);
    expect(project.program.getSourceFileMetadata(missing)).toBeUndefined();
    const before = session.getTimingInfo().totals.requestCount;
    expect(project.program.getSourceFileMetadata(missing)).toBeUndefined();
    expect(session.getTimingInfo().totals.requestCount).toBe(before);
    for (const name of [
      "getSyntacticDiagnostics",
      "getBindDiagnostics",
      "getSemanticDiagnostics",
      "getSuggestionDiagnostics",
      "getDeclarationDiagnostics",
    ] as const) {
      // scriptc's diagnostics have every member set (ts7Diagnostic); the SDK's leave absent ones out.
      expect(project.program[name](file), name).toEqual(
        expected.program[name](file).map(ts7Diagnostic),
      );
      expect(project.program[name](), name).toEqual(expected.program[name]().map(ts7Diagnostic));
    }
    for (const name of [
      "getProgramDiagnostics",
      "getGlobalDiagnostics",
      "getConfigFileParsingDiagnostics",
    ] as const)
      expect(project.program[name](), name).toEqual(expected.program[name]());
    const library = project.program
      .getSourceFileNames()
      .find((name) => name.endsWith("lib.esnext.d.ts"))!;
    expect(library).toBeDefined();
    expect(
      project.program.isSourceFileDefaultLibrary(project.program.getSourceFile(library)!),
    ).toBe(true);
    expect(project.program.isSourceFileFromExternalLibrary(source)).toBe(false);
    snapshot.dispose();
    expect(snapshot.isDisposed()).toBe(true);
    expect(() => snapshot.getProjects()).toThrow("disposed");
    expect(() => project.program.getSourceFileNames()).toThrow("disposed");
  } finally {
    session.close();
    sdk.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("virtual updates share active ASTs and refetch after releasing their baseline", () => {
  const dir = mkdtempSync(join(tempRoot, "scriptc-session-updates-"));
  const a = protocolPath(join(dir, "a.json")),
    b = protocolPath(join(dir, "b.json"));
  const changed = protocolPath(join(dir, "changed.ts")),
    stable = protocolPath(join(dir, "stable.ts"));
  let content = "export const value = 1;";
  let option = "esnext";
  const overlay: Ts7FileSystem = {
    ...fallback,
    readFile: (file) => {
      if (file === a || file === b)
        return JSON.stringify({
          compilerOptions: { strict: true, target: option, types: [] },
          files: [changed, stable],
        });
      if (file === changed) return content;
      if (file === stable) return "export const stable = true;";
      return undefined;
    },
    fileExists: (file) => ([a, b, changed, stable].includes(file) ? true : undefined),
  };
  const session = connect(dir, overlay, true);
  const sdk = new API({ cwd: dir, fs: overlay });
  try {
    const first = session.updateSnapshot({ openProjects: [a, b] });
    const oracleFirst = sdk.updateSnapshot({ openProjects: [a, b] });
    const oracleStable = oracleFirst.getProject(a)!.program.getSourceFile(stable)!;
    const old = first.getProject(a)!.program.getSourceFile(changed)!;
    const retained = first.getProject(a)!.program.getSourceFile(stable)!;
    expect(first.getProject(b)!.program.getSourceFile(changed)).toBe(old);
    content = 'export const value: number = "wrong";';
    const second = session.updateSnapshot({ fileChanges: { changed: [changed] } });
    const oracleSecond = sdk.updateSnapshot({ fileChanges: { changed: [changed] } });
    const next = second.getProject(a)!.program.getSourceFile(changed)!;
    expect(next).not.toBe(old);
    expect(old.text).toContain("= 1");
    expect(next.text).toBe(content);
    expect(
      second
        .getProject(a)!
        .program.getSemanticDiagnostics(changed)
        .map((d) => d.code),
    ).toEqual([2322]);
    expect(first.getProject(a)!.program.getSemanticDiagnostics(changed)).toEqual([]);
    expect(second.getProject(a)!.program.getSourceFile(stable)).toBe(retained);
    first.dispose();
    second.dispose();
    oracleFirst.dispose();
    oracleSecond.dispose();
    const before = session.getTimingInfo().totals.sourceFilesFetched;
    const third = session.updateSnapshot();
    const oracleThird = sdk.updateSnapshot();
    const refreshed = third.getProject(a)!.program.getSourceFile(stable)!;
    expect(refreshed.text).toBe(retained.text);
    expect(session.getTimingInfo().totals.sourceFilesFetched).toBe(before + 1);
    option = "es2020";
    const fourth = session.updateSnapshot({ fileChanges: { changed: [a, b] } });
    const oracleFourth = sdk.updateSnapshot({ fileChanges: { changed: [a, b] } });
    const reparsed = fourth.getProject(a)!.program.getSourceFile(stable)!;
    expect(reparsed === refreshed).toBe(
      oracleFourth.getProject(a)!.program.getSourceFile(stable) === oracleStable,
    );
    expect(fourth.getProject(a)!.compilerOptions.target).toBe(
      oracleFourth.getProject(a)!.compilerOptions.target,
    );
    expect(fourth.getProject(a)!.compilerOptions.target).not.toBe(
      third.getProject(a)!.compilerOptions.target,
    );
    expect(oracleThird.getProject(a)!.program.getSourceFile(stable)).toBe(oracleStable);
    const closed = session.updateSnapshot({ closeProjects: [b] });
    expect(closed.getProject(b)).toBeUndefined();
    expect(closed.getProject(a)).toBeDefined();
    session.close();
    expect(third.isDisposed() && fourth.isDisposed() && closed.isDisposed()).toBe(true);
    expect(session.cache.size).toBe(0);
    expect(() => session.updateSnapshot()).toThrow("closed");
    expect(() => session.parseConfigFile(a)).toThrow("closed");
    expect(() => session.getTimingInfo()).toThrow("closed");
  } finally {
    session.close();
    sdk.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("transport failure during close seals every snapshot and clears retained ASTs", () => {
  const dir = mkdtempSync(join(tempRoot, "scriptc-session-close-"));
  const file = protocolPath(join(dir, "main.ts"));
  const config = protocolPath(join(dir, "tsconfig.json"));
  writeFileSync(file, "export const answer = 42;");
  writeFileSync(
    config,
    JSON.stringify({ compilerOptions: { strict: true, types: [] }, files: [file] }),
  );
  const rpc = transport(dir);
  const session = new Ts7Session(rpc);
  try {
    const first = session.updateSnapshot({ openProjects: [config] });
    const project = first.getProject(config)!;
    const source = project.program.getSourceFile(file)!;
    const type = project.checker.getTypeAtPosition(file, source.text!.indexOf("answer"))!;
    const second = session.updateSnapshot();
    const secondProject = second.getProject(config)!;
    expect(secondProject.program.getSourceFile(file)).toBe(source);
    const third = session.updateSnapshot();
    expect(session.cache.size).toBe(1);
    rpc.close();
    expect(() => session.close()).toThrow("closed");
    for (const snapshot of [first, second, third]) {
      expect(snapshot.isDisposed()).toBe(true);
      expect(() => snapshot.getProjects()).toThrow("closed");
      expect(() => snapshot.dispose()).not.toThrow();
    }
    expect(() => secondProject.checker.getNumberType()).toThrow("disposed");
    expect(() => secondProject.program.getSourceFile(file)).toThrow("closed");
    expect(() => type.getRegularType()).toThrow("disposed");
    expect(session.cache.size).toBe(0);
    expect(() => session.close()).not.toThrow();
  } finally {
    session.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a released latest snapshot cannot lend stale ASTs to the same project", () => {
  const dir = mkdtempSync(join(tempRoot, "scriptc-session-released-"));
  const file = protocolPath(join(dir, "main.ts"));
  const config = protocolPath(join(dir, "tsconfig.json"));
  let source = "export const value = 1;";
  const overlay: Ts7FileSystem = {
    ...fallback,
    readFile: (path) =>
      path === file
        ? source
        : path === config
          ? JSON.stringify({ compilerOptions: { noLib: true, types: [] }, files: [file] })
          : null,
    fileExists: (path) => path === file || path === config,
  };
  const session = connect(dir, overlay);
  try {
    const first = session.updateSnapshot({ openProjects: [config] });
    const old = first.getProject(config)!.program.getSourceFile(file)!;
    first.dispose();
    source = 'export const replacement = "new";';
    const second = session.updateSnapshot({ fileChanges: { changed: [file] } });
    const current = second.getProject(config)!.program.getSourceFile(file)!;
    expect(current.text).toBe(source);
    expect(current).not.toBe(old);
    expect(old.text).toBe("export const value = 1;");
    second.dispose();
    const deleted = session.updateSnapshot({ fileChanges: { deleted: [file] } });
    deleted.dispose();
    source = "export const third = true;";
    const third = session.updateSnapshot({ fileChanges: { created: [file] } });
    expect(third.getProject(config)!.program.getSourceFile(file)!.text).toBe(source);
    expect(getTextOfNode(old.statements.nodes[0]!)).toBe("export const value = 1;");
  } finally {
    session.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

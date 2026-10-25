import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { analyze, compile } from "@scriptc/compiler";
import {
  cjsResolvePaths,
  resolveCjsRuntime,
} from "../../packages/compiler/src/frontend/cjs-resolve.js";
import { FrontendInputTracker } from "../../packages/compiler/src/frontend/input-tracker.js";

const root = fileURLToPath(new URL("../..", import.meta.url));
const entry = join(root, "tests/fixtures/self-hosting/runtime-resolver.ts");

interface Request {
  from: string;
  request: string;
  paths: string[] | null;
  lookup: boolean;
}

function makeCases(directory: string): Request[] {
  const cases: Request[] = [];
  const main = join(directory, "app/main.cjs");
  function file(
    path: string,
    text = 'throw new Error("resolution must never evaluate code");',
  ): void {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
  }
  function pkg(
    name: string,
    config: unknown,
    files: string[] = ["index.js"],
    parent = "app/node_modules",
  ): string {
    const path = join(directory, parent, name);
    file(join(path, "package.json"), JSON.stringify(config));
    for (const name of files) file(join(path, name));
    return path;
  }
  function add(
    requests: string[],
    from = main,
    paths: string[] | null = null,
    lookup = false,
  ): void {
    for (const request of requests) cases.push({ from, request, paths, lookup });
  }
  file(main);
  file(
    join(directory, "app/package.json"),
    JSON.stringify({
      name: "application",
      exports: { ".": "./main.cjs", "./self": "./same.js", "./missing": "./absent.js" },
      imports: {
        "#same": "./same.js",
        "#conditional": { types: "./wrong.d.ts", require: "./same.js", default: "./wrong.js" },
        "#pattern/*": "./parts/*.js",
        "#/prefix/*": "./parts/*.js",
        "#blocked": null,
        "#dependency": "dual",
        "#dependency-subpath": "legacy/sub",
        "#dependency-main": "legacy",
        "#missing": "missing-package",
        "#missing-file": "./absent.js",
        "#builtin": "fs",
        "#node-prefix": "node:fs",
        "#invalid-name": ".",
        "#outside": "../outside.js",
        "#self": "application/self",
        "#bad-main": "bad-main",
        "#no-entry": "no-entry",
      },
    }),
  );
  for (const name of [
    "same.js",
    "same.json",
    "same.node",
    "data.json",
    "addon.node",
    "explicit.mjs",
    "explicit.cjs",
    "typed.ts",
    "parts/a.js",
    "hash#file.js",
    "space name.js",
  ])
    file(join(directory, "app", name));
  file(join(directory, "app/folder/index.json"), "{}");
  file(join(directory, "app/only-mjs/index.mjs"));
  file(join(directory, "app/only-cjs/index.cjs"));
  file(join(directory, "outside.js"));
  pkg(
    "dual",
    {
      exports: {
        ".": { types: "./wrong.d.ts", import: "./wrong.mjs", require: "./right.cjs" },
        "./sub": "./feature.js",
      },
    },
    ["right.cjs", "feature.js", "wrong.d.ts", "wrong.mjs"],
  );
  pkg("legacy", { main: "start" }, ["start.js", "sub.js", "index.js"]);
  pkg("module-field", { module: "wrong.mjs", main: "index.js" }, ["index.js", "wrong.mjs"]);
  pkg("directory-main", { main: "entry" }, ["entry/index.json"]);
  pkg("nested-main", { main: "entry" }, ["entry/index.js", "entry/wrong.js"]);
  file(join(directory, "app/node_modules/nested-main/entry/package.json"), '{"main":"wrong.js"}');
  pkg("bad-main", { main: "missing" }, []);
  pkg("no-main", {}, ["index.node"]);
  pkg("null-exports", { exports: null, main: "index.js" });
  pkg("self-null", { name: "self-null", exports: null });
  pkg("no-entry", {}, []);
  for (const [index, value] of [null, 123, false, "str", [], {}].entries()) {
    pkg(`imports-${index}`, { imports: value });
    add(["#missing"], join(directory, `app/node_modules/imports-${index}/main.cjs`));
  }
  for (const [index, value] of [true, null, 123, [], "text"].entries()) {
    pkg(`invalid-config-${index}`, value);
    add([`invalid-config-${index}`]);
  }
  file(join(directory, "app/node_modules/bom/package.json"), '\ufeff{"main":"index.js"}');
  file(join(directory, "app/node_modules/bom/index.js"));
  file(join(directory, "app/node_modules/manifest-free/index.js"));
  pkg("@scope/pkg", { exports: { ".": "./index.js", "./sub": "./sub.js" } }, [
    "index.js",
    "sub.js",
  ]);
  pkg(
    "patterns",
    {
      exports: {
        "./*": "./general/*.js",
        "./long/*": "./long/*.js",
        "./long/*.js": "./specific/*.js",
        "./exact": "./exact.js",
      },
    },
    ["general/a.js", "long/a.js", "specific/a.js", "exact.js"],
  );
  pkg(
    "conditions",
    {
      exports: {
        ".": { node: { require: "./node.js" }, default: "./default.js" },
        "./default-first": { default: "./default.js", require: "./node.js" },
        "./null-first": { require: null, default: "./default.js" },
        "./nested-unmatched": { node: { unknown: "./node.js" }, default: "./default.js" },
        "./sync": { "module-sync": "./node.js", default: "./default.js" },
        "./addons": { "node-addons": "./node.js", default: "./default.js" },
      },
    },
    ["node.js", "default.js"],
  );
  pkg("arrays", {
    exports: {
      ".": ["../invalid", null, "./index.js"],
      "./invalid": ["../bad", "../worse"],
      "./null": ["../bad", null],
      "./missing": ["./missing.js", "./index.js"],
      "./unmatched": [{ unknown: "./missing.js" }, "./index.js"],
      "./empty": [],
    },
  });
  for (const [name, value] of [
    ["invalid-target", "outside"],
    ["invalid-number", 123],
    ["mixed-map", { ".": "./index.js", require: "./index.js" }],
    ["numeric-condition", { "0": "./index.js", require: "./index.js" }],
    ["encoded-separator", "./a%2fb.js"],
    ["traversal-target", "./x/../index.js"],
    ["encoded-traversal", "./%2e%2e/outside.js"],
    ["node-modules-target", "./node_modules/a.js"],
    ["directory-target", "./entry"],
    ["extension-target", "./index"],
    ["malformed-escape", "./%E0.js"],
  ] as const)
    pkg(name, { exports: value }, ["index.js", "entry/index.js"]);
  file(join(directory, "app/node_modules/malformed/package.json"), "{ broken");
  pkg("scoped-errors", {
    name: "scoped-errors",
    exports: { "./num": { "0": "./index.js" }, "./mix": { require: "outside" } },
  });
  const linked = pkg("linked", { exports: "./index.js" }, ["index.js"], "store");
  symlinkSync(
    linked,
    join(directory, "app/node_modules/linked"),
    process.platform === "win32" ? "junction" : "dir",
  );
  pkg("preferred", { main: "index.js" }, ["index.js"], "vendor/node_modules");
  pkg("preferred", { main: "index.js" }, ["index.js"]);
  pkg("nested", {}, ["index.js"], "app/node_modules/outer/node_modules");
  file(join(directory, "app/node_modules/outer/main.cjs"));
  file(join(directory, "app/node_modules/outer/package.json"), '{"name":"outer"}');
  file(join(directory, "standalone/main.cjs"));
  add([
    "fs",
    "node:fs",
    "node:test",
    "node:missing",
    "missing-package",
    "./missing",
    "./same",
    "./same.js",
    "./data",
    "./addon",
    "./explicit.mjs",
    "./explicit",
    "./explicit.cjs",
    "./typed",
    "./typed.ts",
    "./folder",
    "./folder/",
    "./only-mjs",
    "./only-cjs",
    "./hash#file.js",
    "./space name.js",
    "../outside",
    "./same/",
    "",
    ".",
    "..",
  ]);
  add([join(directory, "app/same.js"), join(directory, "app/folder"), join(directory, "absent")]);
  add([
    "dual",
    "dual/sub",
    "dual/private",
    "legacy",
    "legacy/sub",
    "module-field",
    "directory-main",
    "nested-main",
    "bad-main",
    "no-main",
    "null-exports",
    "manifest-free",
    "@scope/pkg",
    "@scope/pkg/sub",
    "@scope/pkg/private",
    "linked",
  ]);
  add([
    "patterns/a",
    "patterns/long/a",
    "patterns/long/a.js",
    "patterns/exact",
    "patterns/missing",
    "patterns/../x",
    "patterns/%2e%2e/x",
    "patterns/node_modules/x",
  ]);
  add([
    "conditions",
    "conditions/default-first",
    "conditions/null-first",
    "conditions/nested-unmatched",
    "conditions/sync",
    "conditions/addons",
  ]);
  add([
    "arrays",
    "arrays/invalid",
    "arrays/null",
    "arrays/missing",
    "arrays/unmatched",
    "arrays/empty",
  ]);
  add([
    "invalid-target",
    "invalid-number",
    "mixed-map",
    "numeric-condition",
    "encoded-separator",
    "traversal-target",
    "encoded-traversal",
    "node-modules-target",
    "directory-target",
    "extension-target",
    "malformed",
    "malformed-escape",
    "bom",
  ]);
  add(["application", "application/self", "application/private", "application/missing"]);
  add([
    "#same",
    "#conditional",
    "#pattern/a",
    "#/prefix/a",
    "#blocked",
    "#dependency",
    "#dependency-subpath",
    "#dependency-main",
    "#missing",
    "#missing-file",
    "#builtin",
    "#node-prefix",
    "#invalid-name",
    "#outside",
    "#self",
    "#unknown",
    "#",
    "#pattern/",
  ]);
  add(
    ["scoped-errors/num", "scoped-errors/mix"],
    join(directory, "app/node_modules/scoped-errors/inside.cjs"),
  );
  add(["self-null"], join(directory, "app/node_modules/self-null/main.cjs"));
  add(["#bad-main", "#no-entry"]);
  add(["nested", "dual", "#same"], join(directory, "app/node_modules/outer/main.cjs"));
  add(["preferred"], main, [join(directory, "vendor"), join(directory, "app")]);
  add(["preferred"], main, [join(directory, "app"), join(directory, "vendor")]);
  add(["preferred", "./same.js", "fs", join(directory, "app/same.js")], main, []);
  add(["./same.js"], main, [join(directory, "app")]);
  add(["#same", "application/self"], main, []);
  add(["./same.js", "./absent"], join(directory, "app") + sep);
  add(["./same.js"], join(directory, "app") + sep, null, true);
  add(["#unknown", "#"], join(directory, "standalone/main.cjs"));
  add(
    [
      "fs",
      "node:test",
      "./same",
      "../other",
      "...",
      "..name",
      ".name",
      "bare",
      "@scope/pkg",
      "/absolute",
      "#same",
    ],
    main,
    null,
    true,
  );
  add(
    ["nested", "../child", "#same"],
    join(directory, "app/node_modules/outer/main.cjs"),
    null,
    true,
  );
  if (process.platform === "win32") {
    for (const from of [
      "C:\\main.cjs",
      "C:\\work\\node_modules\\package\\main.cjs",
      "\\\\server\\share\\work\\main.cjs",
      "\\\\server\\share\\main.cjs",
    ]) {
      add(["bare", "./file", "..\\file"], from, null, true);
    }
  }
  return cases;
}

function oracle(request: Request): unknown {
  const require = createRequire(request.from);
  if (request.lookup) return require.resolve.paths(request.request);
  try {
    return {
      ok: true,
      value:
        request.paths === null
          ? require.resolve(request.request)
          : require.resolve(request.request, { paths: request.paths }),
    };
  } catch (error) {
    const e = error as NodeJS.ErrnoException;
    return { ok: false, error: { name: e.name, code: e.code ?? "", message: e.message } };
  }
}

function workspace(): string {
  return mkdtempSync(
    join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-runtime-resolver-"),
  );
}

test("filesystem runtime resolver agrees with pinned Node across package and path rules", () => {
  const directory = workspace();
  try {
    for (const request of makeCases(directory)) {
      const actual = request.lookup
        ? cjsResolvePaths(request.from, request.request)
        : resolveCjsRuntime(request.from, request.request, request.paths ?? undefined);
      expect.soft(actual, JSON.stringify(request)).toEqual(oracle(request));
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("runtime lookup tracks failed candidates as well as selected files", () => {
  const directory = workspace();
  try {
    makeCases(directory);
    const tracker = new FrontendInputTracker();
    tracker.run(() => resolveCjsRuntime(join(directory, "app/main.cjs"), "./data"));
    const probes = tracker.snapshot().probes;
    expect(probes).toContainEqual({
      op: "kind",
      path: join(directory, "app/data.js"),
      kind: "missing",
    });
    expect(probes).toContainEqual({
      op: "realpath",
      path: join(directory, "app/data.json"),
      target: realpathSync(join(directory, "app/data.json")),
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

for (const backend of ["llvm"] as const) {
  test(`native runtime resolver: ${backend} matches pinned Node without evaluating modules`, async () => {
    const directory = workspace();
    try {
      const requests = makeCases(directory);
      const input = join(directory, "requests.json");
      writeFileSync(input, JSON.stringify(requests));
      const { coverage } = analyze(entry, {});
      expect(coverage.preflightFailed).toBe(false);
      expect(coverage.stats.statementsFailed).toBe(0);
      expect(coverage.stats.functionsSkipped).toBe(0);
      const built = await compile(entry, {
        outDir: directory,
        outPath: join(directory, process.platform === "win32" ? "resolver.exe" : "resolver"),
        backend,
        sanitize: process.env["SCRIPTC_SAN"] === "1",
      });
      if (!built.ok)
        throw new Error(built.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      const run = spawnSync(built.binaryPath, [input], {
        cwd: root,
        timeout: 30_000,
        maxBuffer: 4 * 1024 * 1024,
      });
      expect(run.error).toBeUndefined();
      expect(run.signal).toBeNull();
      expect(run.status, run.stderr.toString()).toBe(0);
      expect(run.stderr.toString()).toBe("");
      const lines = run.stdout.toString().trimEnd().split("\n");
      expect(lines).toHaveLength(requests.length);
      for (const [index, request] of requests.entries()) {
        const expected = oracle(request);
        // The native host uses its own executable prefix for the last legacy
        // global directory; all other search entries must match Node exactly.
        if (request.lookup && Array.isArray(expected) && expected.length > 1) {
          const executable = realpathSync(built.binaryPath);
          const prefix =
            process.platform === "win32" ? dirname(executable) : dirname(dirname(executable));
          expected[expected.length - 1] = resolve(prefix, "lib", "node");
        }
        expect(JSON.parse(lines[index]!), JSON.stringify(request)).toEqual(expected);
      }
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
}

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { compile } from "../src/index.js";

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "scriptc-native-addon-"));
  dirs.push(dir);
  mkdirSync(join(dir, "native"));
  writeFileSync(
    join(dir, "native", "addon.node"),
    "fixture only; never execute native addons during compilation\n",
  );
  writeFileSync(join(dir, "native", "package.json"), JSON.stringify({ main: "addon.node" }));
  return dir;
}

test.for(["relative", "extensionless", "directory", "absolute", "inline"] as const)(
  `createRequire explains native addon migration: %s`,
  async (form) => {
    const dir = fixture();
    const spec =
      form === "absolute"
        ? join(dir, "native", "addon.node")
        : form === "extensionless"
          ? "./native/addon"
          : form === "directory"
            ? "./native"
            : "./native/addon.node";
    const call =
      form === "inline"
        ? `createRequire(import.meta.url)(${JSON.stringify(spec)})`
        : `require(${JSON.stringify(spec)})`;
    const source = [
      'import { createRequire } from "node:module";',
      "const require = createRequire(import.meta.url);",
      `const native = ${call} as { value: number };`,
      "console.log(native.value);",
    ].join("\n");
    const entry = join(dir, "main.mts");
    writeFileSync(entry, source);
    const result = await compile(entry, {
      outputKind: "ir",
      outDir: dir,
      outPath: join(dir, "out.json"),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const diagnostic = result.diagnostics.find(
      (diag) => diag.code === "SC2020" && diag.message.includes("native addon"),
    );
    expect(diagnostic, JSON.stringify(result.diagnostics)).toBeDefined();
    expect(diagnostic?.message).toContain(spec);
    expect(diagnostic?.hint).toContain("--ffi");
    expect(diagnostic?.hint).toContain("C ABI");
    expect(diagnostic?.hint).toContain("https://scriptc.dev/ffi#replacing-a-node-api-addon");
    expect(source.slice(diagnostic?.loc.start, diagnostic?.loc.end)).toBe(call);
  },
);

test(`a JavaScript directory named .node is still a program module`, async () => {
  const dir = fixture();
  mkdirSync(join(dir, "javascript.node"));
  writeFileSync(join(dir, "javascript.node", "index.js"), "exports.value = 42;\n");
  const entry = join(dir, "main.mts");
  writeFileSync(
    entry,
    [
      'import { createRequire } from "node:module";',
      "const require = createRequire(import.meta.url);",
      'const javascript = require("./javascript.node") as { value: number };',
      "console.log(javascript.value);",
    ].join("\n"),
  );
  const result = await compile(entry, {
    outputKind: "ir",
    outDir: dir,
    outPath: join(dir, "out.json"),
  });
  expect(result.ok, result.ok ? "" : JSON.stringify(result.diagnostics)).toBe(true);
});

test("a missing .node path keeps the unresolved-module diagnostic", async () => {
  const dir = fixture();
  const entry = join(dir, "main.mts");
  writeFileSync(
    entry,
    [
      'import { createRequire } from "node:module";',
      "const require = createRequire(import.meta.url);",
      'require("./missing.node");',
    ].join("\n"),
  );
  const result = await compile(entry, {
    outputKind: "ir",
    outDir: dir,
    outPath: join(dir, "out.json"),
  });
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(
    result.diagnostics.some(
      (diag) => diag.code === "SC2020" && diag.message.includes("./missing.node"),
    ),
  ).toBe(true);
  expect(result.diagnostics.some((diag) => diag.message.includes("native addon"))).toBe(false);
});

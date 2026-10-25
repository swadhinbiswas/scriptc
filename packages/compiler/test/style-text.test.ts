import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile } from "../src/index.js";

test("native styleText explicitly refuses valid custom streams", async () => {
  const dir = mkdtempSync(join(tmpdir(), "scriptc-style-text-"));
  try {
    const entry = join(dir, "main.cjs");
    writeFileSync(
      entry,
      `
const { styleText } = require("node:util");
const custom = { write() {}, on() {}, isTTY: true };
try { styleText("red", "x", {stream: custom}); }
catch (error) { console.log(error.name, error.code, error.message); }
console.log(JSON.stringify(styleText("red", "x", {validateStream: false, stream: custom})));
`,
    );
    const result = await compile(entry, {
      sanitize: process.env["SCRIPTC_SAN"] === "1",
      outDir: dir,
      outPath: join(dir, "program"),
    });
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok) return;
    const child = spawnSync(result.binaryPath, [], { encoding: "utf8" });
    expect(child.status, child.stdout + child.stderr).toBe(0);
    expect(child.stderr).toBe("");
    expect(child.stdout).toBe(
      'TypeError SC2020 util.styleText over native custom streams is not supported yet\n"\\u001b[31mx\\u001b[39m"\n',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

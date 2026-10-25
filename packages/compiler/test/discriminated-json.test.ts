import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { compile } from "../src/index.js";

// A checked assertion intentionally validates more than Node's erased
// assertion. Test rejection here; valid inputs have differential corpus
// coverage through LLVM.
for (const backend of ["llvm"] as const) {
  test(`checked discriminator rejection (${backend})`, async () => {
    const dir = mkdtempSync(
      join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-discriminator-"),
    );
    try {
      const entry = join(dir, "main.ts");
      writeFileSync(
        entry,
        `
        export {};
        type Value = { kind: "empty" } | { kind: "value"; value: number };
        function inspect(json: string): void {
          try {
            const value = JSON.parse(json) as Value;
            console.log(value.kind === "value" ? String(value.value) : "empty");
          } catch (error) {
            console.log("rejected");
          }
        }
        inspect('{"kind":"empty"}');
        inspect('{"kind":"value","value":7}');
        inspect('{"kind":"unknown"}');
        inspect('{"kind":"value"}');
        inspect('{"kind":"value","value":"wrong"}');
        inspect('{"kind":true,"value":8}');
        inspect('{}');
        // Same layouts and different literal contracts must remain separate.
        type Other = { kind: "none" } | { kind: "some"; value: number };
        try {
          const other = JSON.parse('{"kind":"value","value":1}') as Other;
          console.log(other.kind);
        } catch { console.log("separate contract"); }
      `,
      );
      const built = await compile(entry, {
        outDir: dir,
        outPath: join(dir, "program"),
        backend,
        sanitize: process.env["SCRIPTC_SAN"] === "1",
      });
      if (!built.ok) throw new Error(built.diagnostics.map((d) => d.message).join("\n"));
      expect(built.backend).toBe(backend);
      const result = spawnSync(built.binaryPath, [], { timeout: 30_000 });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stderr.toString()).toBe(0);
      expect(result.stdout.toString()).toBe(
        "empty\n7\nrejected\nrejected\nrejected\nrejected\nrejected\nseparate contract\n",
      );
      expect(result.stderr.toString()).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

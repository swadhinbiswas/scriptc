import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { analyze, compile } from "../src/index.js";

const temp = (): string =>
  mkdtempSync(join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-json-callback-"));

// Unsupported forms must be named; accepting a third argument but never
// supplying context.source would change data recovery code without a
// diagnostic.
test.each([
  ["reviver context", `JSON.parse("1", (key, value, context) => context.source);`, "JSON reviver"],
  ["reviver rest context", `JSON.parse("1", (...args) => args.length);`, "JSON reviver"],
  [
    "reviver arguments context",
    `JSON.parse("1", function () { return arguments[2].source; });`,
    "JSON reviver",
  ],
] as const)("JSON callback boundary: %s", (_name, source, message) => {
  const dir = temp();
  try {
    const entry = join(dir, "main.js");
    writeFileSync(entry, source);
    const { coverage } = analyze(entry, {});
    expect(coverage.preflightFailed).toBe(false);
    expect(
      [...coverage.diagnostics, ...(coverage.runtimeFences ?? [])].some(
        (d) => d.code === "SC2020" && d.message.includes(message),
      ),
      JSON.stringify(coverage.diagnostics),
    ).toBe(true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

for (const backend of ["llvm"] as const) {
  test(`JSON callback checked boundaries and recovery (${backend})`, async () => {
    const dir = temp();
    try {
      const entry = join(dir, "main.ts");
      writeFileSync(
        entry,
        `
        export {};
        // Dense dyn arrays must not misrepresent a deleted element as a
        // present undefined. The runtime explicitly refuses that form.
        try {
          JSON.parse("[1,2]", (key: string, value: unknown): unknown => key === "0" ? undefined : value);
        } catch (error) {
          if (error instanceof Error) console.log(error.message);
        }
        // A checked cast still validates the result AFTER revival.
        try {
          const value = JSON.parse('{"n":1}', (key: string, value: unknown): unknown => key === "n" ? "wrong" : value) as { n: number };
          console.log(value.n);
        } catch (error) { console.log(error instanceof TypeError); }
        // Typed callback parameters use checked adaptation, not a raw ABI
        // cast of a JSON object into a number slot.
        try {
          JSON.stringify({ n: 1 }, (_key: string, value: number) => value + 1);
        } catch (error) { console.log(error instanceof TypeError); }
        // A required-string boundary must refuse a dropped root. Inferred
        // bindings and explicitly optional results preserve undefined.
        function required(): string { return JSON.stringify(1, () => undefined); }
        try { console.log(required()); }
        catch (error) { console.log(error instanceof TypeError); }
        function optional(): string | undefined { return JSON.stringify(1, () => undefined); }
        console.log(optional() === undefined);
        function local(): void {
          const result = JSON.stringify(1, () => undefined);
          console.log(result === undefined, typeof result);
        }
        local();
        for (let i = 0; i < 20; i++) {
          try {
            const record = JSON.parse('{"opaque":{"deep":[1,2]},"typed":"wrong"}') as { opaque: unknown; typed: number };
            console.log(record.typed);
          } catch (error) { if (i === 0) console.log(error instanceof TypeError); }
          try {
            const rows = JSON.parse('[{"opaque":1,"typed":2},{"opaque":3,"typed":false}]') as { opaque: unknown; typed: number }[];
            console.log(rows.length);
          } catch (error) { if (i === 0) console.log(error instanceof TypeError); }
        }
        const recovered = JSON.parse('{"n":1}', (_key: string, value: unknown) => value) as { n: number };
        console.log(recovered.n);
      `,
      );
      const built = await compile(entry, {
        outDir: dir,
        outPath: join(dir, process.platform === "win32" ? "program.exe" : "program"),
        backend,
        sanitize: process.env["SCRIPTC_SAN"] === "1",
      });
      if (!built.ok)
        throw new Error(built.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      expect(built.backend).toBe(backend);
      const result = spawnSync(built.binaryPath, [], { timeout: 30_000 });
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status, result.stderr.toString()).toBe(0);
      expect(result.stdout.toString()).toBe(
        [
          "JSON.parse reviver deleting array elements is not supported yet",
          "true",
          "true",
          "true",
          "true",
          "true undefined",
          "true",
          "true",
          "1",
          "",
        ].join("\n"),
      );
      expect(result.stderr.toString()).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

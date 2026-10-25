import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, test } from "vitest";
import { nativeCodegenTarget, nativeHelperForTarget } from "../src/backend/targets.js";

const execFileAsync = promisify(execFile);
const target = nativeCodegenTarget();
const helperSpec = target === null ? null : nativeHelperForTarget(target);
const helper = (() => {
  if (helperSpec === null || process.platform === "win32") return null;
  try {
    const packageJson = createRequire(import.meta.url).resolve(
      `${helperSpec.packageName}/package.json`,
    );
    return join(dirname(packageJson), "bin", "scriptc-llvm-codegen");
  } catch {
    return null;
  }
})();
const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

/** A program whose internal functions, constants and state must stay
 * reachable across partitions. `edit` changes one function's addend. */
function program(edit = 0, extra = "", count = 24): string {
  const lines = [
    "; partitioned program",
    "%Pair = type { i64, i64 }",
    "@total = internal global i64 0",
    "@pair = internal global %Pair { i64 3, i64 4 }",
    '@label = private unnamed_addr constant [6 x i8] c"total\\00"',
    "declare i64 @strlen(ptr)",
    extra,
    "define internal void @bump(i64 %value) {",
    "  %old = load i64, ptr @total",
    "  %new = add i64 %old, %value",
    "  store i64 %new, ptr @total",
    "  ret void",
    "}",
  ];
  for (let index = 0; index < count; index++) {
    const addend = index === 5 ? index + edit : index;
    lines.push(
      `define internal void @step${index}(i64 %value) noinline {`,
      `  %scaled = mul i64 %value, ${addend}`,
      `  call void @bump(i64 %scaled)`,
      ...(index + 1 < count ? [`  call void @step${index + 1}(i64 %value)`] : []),
      "  ret void",
      "}",
    );
  }
  lines.push(
    "define i32 @main() {",
    "  %second = load i64, ptr getelementptr (%Pair, ptr @pair, i32 0, i32 1)",
    "  call void @step0(i64 %second)",
    // A second caller for every step keeps the steps in separate partitions.
    ...Array.from({ length: count - 1 }, (_, index) => `  call void @step${index + 1}(i64 1)`),
    "  %length = call i64 @strlen(ptr @label)",
    "  call void @bump(i64 %length)",
    "  %total = load i64, ptr @total",
    "  %low = urem i64 %total, 251",
    "  %code = trunc i64 %low to i32",
    "  ret i32 %code",
    "}",
  );
  return lines.join("\n") + "\n";
}

function expectedExit(edit = 0, count = 24): number {
  const addends = Array.from({ length: count }, (_, index) => (index === 5 ? index + edit : index));
  let total = 5; // strlen("total")
  for (let start = 0; start < count; start++)
    for (let index = start; index < count; index++)
      total += (start === 0 ? 4 : 1) * addends[index]!;
  return total % 251;
}

async function emit(
  dir: string,
  source: string,
  options: { outputs: number; optLevel: "0" | "2"; cache?: string; name: string },
): Promise<string[]> {
  const input = join(dir, `${options.name}.ll`);
  await writeFile(input, source);
  const outputs = Array.from({ length: options.outputs }, (_, index) =>
    join(dir, `${options.name}.${index}.o`),
  );
  await execFileAsync(helper!, [
    "emit",
    "--input",
    input,
    ...outputs.flatMap((output) => ["--output", output]),
    "--filetype",
    "obj",
    "--target",
    target!.llvmTriple,
    "--opt-level",
    options.optLevel,
    "--relocation-model",
    "pic",
    "--diagnostic-format",
    "json",
    "--source-path",
    "/src/program.ts",
    ...(options.cache === undefined ? [] : ["--cache-dir", options.cache]),
  ]);
  return outputs;
}

async function exitCode(dir: string, objects: string[], name: string): Promise<number> {
  const executable = join(dir, name);
  await execFileAsync(process.env["CC"] ?? "cc", [...objects, "-o", executable]);
  try {
    await execFileAsync(executable, []);
    return 0;
  } catch (error) {
    return (error as { code: number }).code;
  }
}

async function cacheEntries(cache: string, suffix: string): Promise<Set<string>> {
  const entries = new Set<string>();
  for (const bucket of await readdir(cache).catch(() => [])) {
    for (const name of await readdir(join(cache, bucket)).catch(() => []))
      if (name.endsWith(suffix)) entries.add(name);
  }
  return entries;
}

describe.runIf(helper !== null)("LLVM program partitions", () => {
  for (const optLevel of ["2", "0"] as const) {
    test(`opt-level ${optLevel} partitions link deterministically and reuse unchanged partitions`, async () => {
      const dir = await mkdtemp(join(tmpdir(), "scriptc-partitions-"));
      dirs.push(dir);
      const cache = join(dir, "cache");
      const first = await emit(dir, program(), { outputs: 4, optLevel, cache, name: "first" });
      const whole = await emit(dir, program(), { outputs: 1, optLevel, name: "whole" });
      expect(await exitCode(dir, first, "first")).toBe(expectedExit());
      expect(await exitCode(dir, whole, "whole")).toBe(expectedExit());

      // The same module always yields the same objects, with or without reuse.
      const fresh = await emit(dir, program(), { outputs: 4, optLevel, name: "fresh" });
      const reused = await emit(dir, program(), { outputs: 4, optLevel, cache, name: "reused" });
      const contents = (paths: string[]) => Promise.all(paths.map((path) => readFile(path)));
      expect(await contents(fresh)).toEqual(await contents(first));
      expect(await contents(reused)).toEqual(await contents(first));

      // An edit to one function changes one partition's source; the rest
      // are reused.
      const sources = await cacheEntries(cache, optLevel === "0" ? ".o" : ".bc");
      const edited = await emit(dir, program(7), { outputs: 4, optLevel, cache, name: "edited" });
      const after = await cacheEntries(cache, optLevel === "0" ? ".o" : ".bc");
      expect([...after].filter((entry) => !sources.has(entry))).toHaveLength(1);
      expect(await exitCode(dir, edited, "edited")).toBe(expectedExit(7));
    });
  }

  test("functions under one group line share a partition", async () => {
    const dir = await mkdtemp(join(tmpdir(), "scriptc-partitions-groups-"));
    dirs.push(dir);
    // Groups of four steps, each smaller than the mean partition; main ends
    // the last group. Placement by group applies from 32 partitions.
    const steps = 128;
    const grouped = (edit: number, count = steps) =>
      program(edit, "", count)
        .split("\n")
        .flatMap((line) => {
          const step = /^define internal void @step(\d+)\(/.exec(line);
          if (step !== null && Number(step[1]) % 4 === 0)
            return [`; scriptc-group ${Number(step[1]) / 4}`, line];
          return line.startsWith("define i32 @main(") ? ["; scriptc-group", line] : [line];
        })
        .join("\n");
    const cache = join(dir, "cache");
    const options = { outputs: 32, optLevel: "0", cache } as const;
    const objects = await emit(dir, grouped(0), { ...options, name: "grouped" });
    expect(await exitCode(dir, objects, "grouped")).toBe(expectedExit(0, steps));
    const owner = new Map<number, number>();
    for (const [index, object] of objects.entries()) {
      const { stdout } = await execFileAsync("nm", [object]);
      for (const line of stdout.split("\n")) {
        const defined = /^[0-9a-fA-F]+ [A-Za-z] _?step(\d+)$/.exec(line.trim());
        if (defined !== null) owner.set(Number(defined[1]), index);
      }
    }
    expect(owner.size).toBe(steps);
    // step0's only caller is main, so it goes with main.
    for (let group = 0; group < steps / 4; group++) {
      const members = [0, 1, 2, 3].map((offset) => group * 4 + offset).filter((step) => step > 0);
      expect(new Set(members.map((step) => owner.get(step))).size).toBe(1);
    }

    // An edit to one function still changes one partition's source.
    const sources = await cacheEntries(cache, ".o");
    const edited = await emit(dir, grouped(7), { ...options, name: "edited" });
    const after = await cacheEntries(cache, ".o");
    expect([...after].filter((entry) => !sources.has(entry))).toHaveLength(1);
    expect(await exitCode(dir, edited, "edited")).toBe(expectedExit(7, steps));

    // With fewer partitions, functions keep their placement by name.
    const contents = (paths: string[]) => Promise.all(paths.map((path) => readFile(path)));
    const few = { outputs: 4, optLevel: "0" } as const;
    expect(
      await contents(await emit(dir, grouped(0, 24), { ...few, name: "few-grouped" })),
    ).toEqual(await contents(await emit(dir, program(), { ...few, name: "few-plain" })));
  });

  test("a table written one element per line keeps the text partitioner and its reuse", async () => {
    const dir = await mkdtemp(join(tmpdir(), "scriptc-partitions-table-"));
    dirs.push(dir);
    // The emitter writes interface dispatch tables one element per line.
    const table = [
      "@table = internal constant [2 x ptr] [",
      "  ptr @step3,",
      "  ptr @step9",
      "]",
    ].join("\n");
    const source = (edit: number) =>
      program(edit, table).replace(
        "  %total = load i64, ptr @total",
        "  %entry = load ptr, ptr @table\n  call void %entry(i64 0)\n  %total = load i64, ptr @total",
      );
    const cache = join(dir, "cache");
    const first = await emit(dir, source(0), { outputs: 4, optLevel: "2", cache, name: "first" });
    expect(await exitCode(dir, first, "first")).toBe(expectedExit());
    const sources = await cacheEntries(cache, ".bc");
    const edited = await emit(dir, source(7), { outputs: 4, optLevel: "2", cache, name: "edited" });
    const after = await cacheEntries(cache, ".bc");
    expect([...after].filter((entry) => !sources.has(entry))).toHaveLength(1);
    expect(await exitCode(dir, edited, "edited")).toBe(expectedExit(7));
  });

  test("inputs outside the text partitioner's grammar are still partitioned", async () => {
    const dir = await mkdtemp(join(tmpdir(), "scriptc-partitions-fallback-"));
    dirs.push(dir);
    const source = program(0, '@"quoted name" = internal global i64 1').replace(
      "  %old = load i64, ptr @total",
      '  %old = load i64, ptr @total\n  %unused = load i64, ptr @"quoted name"',
    );
    for (const optLevel of ["2", "0"] as const) {
      const objects = await emit(dir, source, {
        outputs: 3,
        optLevel,
        name: `fallback${optLevel}`,
      });
      expect(await exitCode(dir, objects, `fallback${optLevel}`)).toBe(expectedExit());
    }
  });

  test("debug metadata follows the functions that reference it", async () => {
    const dir = await mkdtemp(join(tmpdir(), "scriptc-partitions-debug-"));
    dirs.push(dir);
    const debug = program()
      .split("\n")
      .map((line) => {
        const definition =
          /^define internal void @step(\d+)(?:\.i32)?\(i64 %value\) noinline \{$/.exec(line);
        if (definition !== null)
          return line.replace(" {", ` !dbg !${10 + Number(definition[1])} {`);
        const call = /^ {2}call void @step(\d+)\(i64 %value\)$/.exec(line);
        return call === null ? line : `${line}, !dbg !${40 + Number(call[1]) - 1}`;
      });
    const source = [
      ...debug,
      "!llvm.dbg.cu = !{!0}",
      "!llvm.module.flags = !{!2, !3}",
      '!0 = distinct !DICompileUnit(language: DW_LANG_C, file: !1, producer: "test", isOptimized: false, runtimeVersion: 0, emissionKind: FullDebug)',
      '!1 = !DIFile(filename: "program.ts", directory: "/src")',
      '!2 = !{i32 2, !"Debug Info Version", i32 3}',
      '!3 = !{i32 7, !"Dwarf Version", i32 5}',
      "!4 = !DISubroutineType(types: !{})",
      ...Array.from(
        { length: 24 },
        (_, index) =>
          `!${10 + index} = distinct !DISubprogram(name: "step${index}", scope: !1, file: !1, line: ${index + 1}, type: !4, spFlags: DISPFlagDefinition, unit: !0)`,
      ),
      ...Array.from(
        { length: 23 },
        (_, index) =>
          `!${40 + index} = !DILocation(line: ${index + 1}, column: 3, scope: !${10 + index})`,
      ),
      "",
    ].join("\n");
    const cache = join(dir, "cache");
    const objects = await emit(dir, source, { outputs: 4, optLevel: "0", cache, name: "debug" });
    const bytes = await Promise.all(objects.map((path) => readFile(path)));
    // ELF and COFF name the section .debug_info; Mach-O names it __debug_info.
    expect(bytes.filter((object) => object.includes("debug_info")).length).toBeGreaterThan(1);
    expect(await exitCode(dir, objects, "debug")).toBe(expectedExit());

    // Partitions number their metadata locally, so a module whose node
    // numbers all shift still reuses every partition.
    const before = await cacheEntries(cache, ".o");
    const shifted = source.replace(/!(\d+)/g, (_, number: string) => `!${Number(number) + 100}`);
    const renumbered = await emit(dir, shifted, {
      outputs: 4,
      optLevel: "0",
      cache,
      name: "renumbered",
    });
    expect(await cacheEntries(cache, ".o")).toEqual(before);
    expect(await Promise.all(renumbered.map((path) => readFile(path)))).toEqual(bytes);
  });
});

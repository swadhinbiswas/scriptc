/* Reproducible CLI build latency: empty-cache builds, exact repeats, and
 * actual edits to an imported module. Each invocation owns a fresh cache so
 * an earlier benchmark cannot turn its edit cases into native object hits. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    iterations: { type: "string", default: "5" },
    compiler: { type: "string" },
    optimization: { type: "string", default: "dev" },
    modules: { type: "string", default: "16" },
    functions: { type: "string", default: "16" },
    timings: { type: "boolean", default: false },
    strip: { type: "boolean", default: false },
    workload: { type: "string", default: "modules" },
    memory: { type: "boolean", default: false },
    launches: { type: "string", default: "20" },
    help: { type: "boolean", default: false },
  },
});
if (values.help) {
  console.log(
    "Usage: pnpm bench:builds [--compiler=<native executable>] [--workload=modules|log-summary|inventory-report] [--iterations=5] [--optimization=dev|release] [--memory] [--timings] [--launches=20] [--modules=16] [--functions=16] [--strip]",
  );
  console.log(
    "Reports empty-cache builds, unchanged builds, edits, executable size, and end-to-end run time. --memory reports peak process RSS using /usr/bin/time, not summed concurrent memory. The modules workload is generated; log-summary and inventory-report exercise file-processing applications.",
  );
  process.exit(0);
}
const iterations = Number(values.iterations);
const launches = Number(values.launches);
if (!Number.isInteger(launches) || launches < 1 || launches > 1000)
  throw new Error("--launches must be an integer between 1 and 1000");
if (!["modules", "log-summary", "inventory-report"].includes(values.workload))
  throw new Error("--workload must be modules, log-summary, or inventory-report");
if (values.memory && process.platform !== "darwin" && process.platform !== "linux")
  throw new Error("--memory requires macOS or Linux /usr/bin/time");
if (!Number.isInteger(iterations) || iterations < 1 || iterations > 100) {
  throw new Error("--iterations must be an integer between 1 and 100");
}
if (!["dev", "release"].includes(values.optimization))
  throw new Error("--optimization must be dev or release");
const modules = Number(values.modules);
const functions = Number(values.functions);
for (const [name, value] of [
  ["modules", modules],
  ["functions", functions],
]) {
  if (!Number.isInteger(value) || value < 1 || value > 256)
    throw new Error(`--${name} must be an integer between 1 and 256`);
}
if (process.env.SCRIPTC_TARGET && process.env.SCRIPTC_TARGET !== "native") {
  throw new Error("bench:builds runs host executables; unset SCRIPTC_TARGET");
}
const cli =
  values.compiler ?? fileURLToPath(new URL("../packages/cli/dist/bootstrap.js", import.meta.url));
await access(cli).catch(() => {
  throw new Error("Build the workspace with pnpm build before running bench:builds");
});
const root = await mkdtemp(
  join(process.platform === "win32" ? tmpdir() : "/tmp", "scriptc-bench-builds-"),
);
const cache = join(root, "cache");
const entry = join(root, "main.ts");
const binary = join(root, process.platform === "win32" ? "program.exe" : "program");
const env = { ...process.env, SCRIPTC_CACHE_DIR: cache };
delete env.SCRIPTC_NO_CACHE;
delete env.SCRIPTC_CACHE_MAX_MB;
delete env.SCRIPTC_TEST_STABLE_TOOLCHAIN;
delete env.SCRIPTC_TIMING;
const samples = [];
let previousOutput;
const runtimeArgs =
  values.workload === "log-summary"
    ? [join(root, "requests.log"), "--min-status", "200", "--limit", "12"]
    : values.workload === "inventory-report"
      ? [join(root, "inventory.tsv")]
      : [];

function moduleSource(module, offset) {
  return (
    Array.from(
      { length: functions },
      (_, fn) =>
        `export function value${fn}(n: number): number { return n * ${module + 1} + ${fn + offset}; }`,
    ).join("\n") + "\n"
  );
}

function run(command, args, timings = false, memory = false) {
  const measuredArgs =
    process.platform === "darwin"
      ? ["-l", command, ...args]
      : ["-f", "scriptc_peak_rss_kib=%M", command, ...args];
  const result = spawnSync(memory ? "/usr/bin/time" : command, memory ? measuredArgs : args, {
    env: timings ? { ...env, SCRIPTC_TIMING: "1" } : env,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 600_000,
  });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, `${command} received ${result.signal}`);
  let stderr = result.stderr;
  let peakRssBytes;
  if (memory) {
    const match =
      process.platform === "darwin"
        ? /\s+(\d+)\s+maximum resident set size/.exec(stderr)
        : /scriptc_peak_rss_kib=(\d+)/.exec(stderr);
    assert.ok(match, "time did not report peak RSS");
    peakRssBytes = Number(match[1]) * (process.platform === "darwin" ? 1 : 1024);
    stderr =
      process.platform === "darwin"
        ? stderr.replace(/\s+\d+(?:\.\d+)? real\s+[\s\S]*$/, "")
        : stderr.replace(/scriptc_peak_rss_kib=\d+\n?/, "");
  }
  return {
    stdout: result.stdout,
    stderr,
    status: result.status,
    ...(peakRssBytes === undefined ? {} : { peakRssBytes }),
  };
}

function build(phase) {
  const start = performance.now();
  const args = [
    "build",
    entry,
    `--optimization=${values.optimization}`,
    "-o",
    binary,
    ...(values.strip ? ["--strip"] : []),
  ];
  const result = values.compiler
    ? run(cli, args, values.timings, values.memory)
    : run(process.execPath, [cli, ...args], values.timings, values.memory);
  const ms = Math.round((performance.now() - start) * 10) / 10;
  assert.equal(result.status, 0, result.stderr);
  // Correctness checks are outside the timed build and run after EVERY edit,
  // so a stale executable cannot masquerade as a faster rebuild.
  const oracle = run(process.execPath, [entry, ...runtimeArgs]);
  assert.equal(oracle.status, 0, oracle.stderr);
  if (phase === "edit")
    assert.notEqual(oracle.stdout, previousOutput, "the edit must change the application's output");
  assert.deepEqual(run(binary, runtimeArgs), oracle);
  previousOutput = oracle.stdout;
  const timings = result.stderr.split("\n").flatMap((line) => {
    const prefix = "scriptc timing ";
    return line.startsWith(prefix) ? [JSON.parse(line.slice(prefix.length))] : [];
  });
  samples.push({
    phase,
    ms,
    ...(values.timings ? { timings } : {}),
    ...(values.memory ? { peak_rss_bytes: result.peakRssBytes } : {}),
  });
  process.stderr.write(`${phase}: ${ms} ms\n`);
}

function median(phase) {
  const sorted = samples
    .filter((sample) => sample.phase === phase)
    .map((sample) => sample.ms)
    .sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return (
    Math.round(
      (sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2) * 10,
    ) / 10
  );
}

try {
  await mkdir(cache, { mode: 0o700 });
  if (values.workload !== "modules") {
    await cp(
      fileURLToPath(new URL(`../benchmarks/builds/${values.workload}`, import.meta.url)),
      root,
      { recursive: true },
    );
    await writeFile(join(root, "package.json"), '{"type":"module"}\n');
  }
  if (values.workload === "log-summary") {
    await writeFile(
      join(root, "requests.log"),
      Array.from(
        { length: 10_000 },
        (_, i) =>
          `/route/${i % 37}?request=${i} ${i % 13 === 0 ? 500 : 200} ${i % 250} ${200 + (i % 4000)}`,
      ).join("\n") + "\n",
    );
  } else if (values.workload === "inventory-report") {
    await writeFile(
      join(root, "inventory.tsv"),
      Array.from({ length: 10_000 }, (_, i) =>
        ["sku-" + i, "category-" + (i % 17), "product " + i, i % 40, 199 + (i % 5000)].join("\t"),
      ).join("\n") + "\n",
    );
  } else {
    await Promise.all(
      Array.from({ length: modules }, (_, i) =>
        writeFile(join(root, `module${i}.ts`), moduleSource(i, 0)),
      ),
    );
    await writeFile(
      entry,
      [
        ...Array.from({ length: modules }, (_, i) => `import * as m${i} from './module${i}.ts';`),
        "let total = 0;",
        ...Array.from(
          { length: modules },
          (_, i) =>
            `total += ${Array.from({ length: functions }, (_, fn) => `m${i}.value${fn}(2)`).join(" + ")};`,
        ),
        "console.log(total);",
        "",
      ].join("\n"),
    );
  }
  for (let i = 0; i < iterations; i++) {
    if (i > 0) {
      await rm(cache, { recursive: true, force: true });
      await mkdir(cache, { mode: 0o700 });
    }
    build("cold");
  }
  for (let i = 0; i < iterations; i++) build("unchanged");
  for (let i = 1; i <= iterations; i++) {
    if (values.workload !== "modules") {
      const path = join(root, values.workload === "log-summary" ? "format.ts" : "config.ts");
      await writeFile(
        path,
        (await readFile(path, "utf8")).replace(
          /export const revision = \d+;/,
          `export const revision = ${i};`,
        ),
      );
    } else await writeFile(join(root, "module0.ts"), moduleSource(0, i));
    build("edit");
  }
  const runtimeSamples = [];
  for (let i = -3; i < launches; i++) {
    const start = performance.now();
    const result = run(binary, runtimeArgs);
    assert.equal(result.status, 0, result.stderr);
    if (i >= 0) runtimeSamples.push(performance.now() - start);
  }
  runtimeSamples.sort((a, b) => a - b);
  const memoryResult = values.memory ? run(binary, runtimeArgs, false, true) : undefined;
  if (memoryResult !== undefined) assert.equal(memoryResult.status, 0, memoryResult.stderr);
  const runtimeMemory = memoryResult?.peakRssBytes;
  process.stdout.write(
    JSON.stringify(
      {
        compiler: values.compiler ?? "workspace CLI",
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        optimization: values.optimization,
        strip: values.strip,
        workload: values.workload,
        ...(values.workload === "modules"
          ? { modules: modules + 1, functions: modules * functions }
          : {
              application_modules: values.workload === "log-summary" ? 5 : 15,
              input_records: 10_000,
            }),
        iterations,
        median_ms: Object.fromEntries(
          ["cold", "unchanged", "edit"].map((phase) => [phase, median(phase)]),
        ),
        samples,
        executable: {
          bytes: (await stat(binary)).size,
          median_run_ms:
            (runtimeSamples[Math.floor((launches - 1) / 2)] +
              runtimeSamples[Math.floor(launches / 2)]) /
            2,
          runs: launches,
          ...(runtimeMemory === undefined ? {} : { peak_rss_bytes: runtimeMemory }),
        },
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await rm(root, { recursive: true, force: true });
}

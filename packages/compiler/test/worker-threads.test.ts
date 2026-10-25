import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, expect, test, vi } from "vitest";
import { compile, compileLibrary } from "../src/index.js";

const directories: string[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function fixture(source: string) {
  const outDir = await mkdtemp(join(tmpdir(), "scriptc-worker-target-"));
  directories.push(outDir);
  const entry = join(outDir, "main.ts");
  await writeFile(entry, source);
  return { entry, outDir, outPath: join(outDir, "program.ll"), outputKind: "llvm" as const };
}
const worker =
  'import { Worker } from "node:worker_threads"; new Worker(new URL(import.meta.url));';

test.each(["wasi"])(
  "worker constructors refuse %s execution before code generation",
  async (mode) => {
    const request = await fixture(worker);
    if (mode === "wasi") {
      vi.stubEnv("SCRIPTC_CC", "zigcc");
      vi.stubEnv("SCRIPTC_TARGET", "wasm32-wasi");
    }
    const result = await compile(request.entry, { ...request });
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "SC2020",
            message: expect.stringContaining("Worker execution"),
          }),
        ]),
      );
  },
);

test("runtime worker filenames produce an actionable source diagnostic", async () => {
  const request = await fixture(
    'import { Worker } from "node:worker_threads"; new Worker(process.argv[2]);',
  );
  const result = await compile(request.entry, request);
  expect(result.ok).toBe(false);
  if (!result.ok)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SC2020",
          hint: expect.stringContaining("statically compiled"),
        }),
      ]),
    );
});

test("libraries refuse worker roots through the library diagnostic boundary", async () => {
  const request = await fixture(worker + "\nexport function boot(): number { return 0; }");
  const profilePath = join(request.outDir, "profile.json");
  await writeFile(
    profilePath,
    JSON.stringify({
      profile_format: 1,
      name: "worker-library",
      entry: "main.ts",
      emission: "llvm",
      abi: {
        prefix: "w_",
        init_symbol: "w_init",
        sink_register_symbol: "w_panic",
        collect_symbol: null,
        result_reset_symbol: null,
      },
      exports: [{ export: "boot", symbol: "w_boot", params: [], returns: "f64" }],
    }),
  );
  const result = await compileLibrary({ profilePath, outDir: request.outDir });
  expect(result.ok).toBe(false);
  if (!result.ok)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "SC4005", message: expect.stringContaining("worker") }),
      ]),
    );
});

test("worker TLS arguments use local snapshots before native pointer expansion", async () => {
  const request = await fixture(
    worker +
      '\nimport { createSecureContext } from "node:tls"; const cert = Buffer.from(new SharedArrayBuffer(4)); createSecureContext({cert, key: cert});',
  );
  const result = await compile(request.entry, request);
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (result.ok) {
    const llvm = await readFile(request.outPath, "utf8");
    expect(llvm).toContain("call ptr @scr_bytes_local_copy(");
    expect(llvm).toContain("call ptr @scr_tls_create_secure_context(");
  }
});

test("worker programs refuse foreign callbacks and guard byte-pointer FFI calls", async () => {
  for (const foreign of [true, false]) {
    const source = foreign
      ? "declare function nativeStart(cb: (value: number) => void): void; nativeStart(() => {});"
      : "declare function consume(value: Uint8Array): number; consume(new Uint8Array(new SharedArrayBuffer(4)));";
    const request = await fixture(worker + source);
    const ffiProfilePath = join(request.outDir, "ffi.json");
    await writeFile(
      ffiProfilePath,
      JSON.stringify({
        ffi_format: 5,
        functions: [
          foreign
            ? {
                name: "nativeStart",
                symbol: "native_start",
                returns: "void",
                params: [
                  {
                    callback: {
                      id: "tick",
                      params: ["f64", { context: "tick" }],
                      returns: "void",
                      lifetime: "retained",
                      invoke: "foreign",
                    },
                  },
                  { context: "tick" },
                ],
              }
            : { name: "consume", symbol: "consume", params: ["bytes"], returns: "f64" },
        ],
      }),
    );
    const result = await compile(request.entry, { ...request, ffiProfilePath });
    expect(result.ok, JSON.stringify(result)).toBe(!foreign);
    if (result.ok)
      expect(await readFile(request.outPath, "utf8")).toContain(
        "call void @scr_bytes_require_unshared(",
      );
    else
      expect(result.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "SC2020",
            message: expect.stringContaining("foreign-thread"),
          }),
        ]),
      );
  }
});

test("worker programs inline the thread-local allocator and keep async state behind runtime calls", async () => {
  const source =
    worker +
    `
class Cell {
  constructor(public next: Cell | null, public value: number) {}
}
let head: Cell | null = null;
for (let i = 0; i < 3; i++) head = new Cell(head, i);
async function settle(): Promise<number> {
  return head === null ? 0 : head.value;
}
settle().then((value) => console.log(value));
`;
  const request = await fixture(source);
  const result = await compile(request.entry, request);
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (result.ok) {
    const llvm = await readFile(request.outPath, "utf8");
    // Worker runtimes keep one small-object allocator per script thread:
    // the inline paths address its state, live counts and dispose hook in
    // the runtime's one thread-local ScrThreadHot block.
    expect(llvm).toMatch(/@scr_thread_hot = external thread_local(\(localexec\))? global /);
    expect(llvm).not.toMatch(/@scr_(sa|cyc_live|cyc_old_freed|weak_dispose_hook) = external/);
    expect(llvm).toContain("call ptr @llvm.threadlocal.address.p0(ptr @scr_thread_hot)");
    expect(llvm).toMatch(/getelementptr inbounds i8, ptr %[\w.]+\.tl\.hot, i64 1000/);
    // Worker fibers own context termination; no fiberless async frames.
    expect(llvm).not.toContain("@scr_async_inline_enter");
  }
});

test("JavaScript worker entry spellings run their TypeScript sources", async () => {
  const request = await fixture(`import { Worker } from "node:worker_threads";
function run(worker: Worker): Promise<void> {
  return new Promise<void>((resolve) => {
    worker.on("message", (text: string) => console.log(text));
    worker.on("exit", () => resolve());
  });
}
await run(new Worker(new URL("./task.js", import.meta.url)));
await run(new Worker(new URL("./module-task.mjs", import.meta.url)));
`);
  for (const [file, text] of [
    ["task.ts", "script task"],
    ["module-task.mts", "module task"],
  ])
    await writeFile(
      join(request.outDir, file),
      `import { parentPort } from "node:worker_threads";\nparentPort!.postMessage("${text}");\n`,
    );
  const outPath = join(request.outDir, "program");
  const result = await compile(request.entry, { outDir: request.outDir, outPath });
  expect(result.ok, JSON.stringify(result)).toBe(true);
  const { stdout } = await promisify(execFile)(outPath, [], { encoding: "utf8" });
  expect(stdout).toBe("script task\nmodule task\n");
});

test("worker entries without a source file stay refused", async () => {
  const request = await fixture(
    'import { Worker } from "node:worker_threads"; new Worker(new URL("./missing.js", import.meta.url));',
  );
  const result = await compile(request.entry, request);
  expect(result.ok).toBe(false);
  if (!result.ok)
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: expect.stringContaining("missing.js") }),
      ]),
    );
});

test.each([
  ["arm64-apple-macosx14.0.0", "alert"],
  ["x86_64-unknown-linux-gnu", "flag"],
  ["aarch64-unknown-linux-gnu", "flag"],
])(
  "worker programs for %s poll inline (%s) and skip termination polls in bounded functions",
  async (target, lane) => {
    vi.stubEnv("SCRIPTC_TARGET", target);
    const request = await fixture(
      worker +
        `
function mix(a: number, b: number): number { return (a * 31 + b) % 1000003; }
function spin(n: number): number { return n < 2 ? mix(n, 1) : spin(n - 1) + spin(n - 2); }
console.log(mix(1, 2), spin(5));
`,
    );
    const result = await compile(request.entry, request);
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (result.ok) {
      const llvm = await readFile(request.outPath, "utf8");
      const body = (name: string): string => {
        const start = llvm.search(new RegExp(`^define [^\\n]*@${name}(?:\\.i32)?\\(`, "m"));
        expect(start).toBeGreaterThanOrEqual(0);
        return llvm.slice(start, llvm.indexOf("\n}\n", start));
      };
      // A bounded helper neither polls on entry nor makes its callers poll.
      expect(body("sc_f_mix")).not.toMatch(/@scr_exc_(alert|flag)/);
      // Recursion tests after its recursive calls (its stack check replaces
      // the entry poll) and never reads its thread-local cell inline.
      expect(body("sc_f_spin")).not.toContain("@scr_exc_active");
      if (lane === "alert") {
        // Darwin: the inline test reads the process-wide alert word (a
        // thread-local access is a call there), and only the slow path calls
        // into the runtime.
        expect(body("sc_f_spin")).toMatch(/load atomic i32, ptr @scr_exc_alert monotonic/);
        expect(body("sc_f_spin")).toContain("call zeroext i1 @scr_exc_pending()");
        expect(llvm).toMatch(/^@scr_exc_alert = external dso_local global i32, align 64$/m);
      } else {
        // ELF: the thread's exact pending word, one TLS load, no slow path.
        expect(body("sc_f_spin")).toMatch(
          /load atomic i32, ptr @scr_exc_flag (unordered|monotonic)/,
        );
        expect(body("sc_f_spin")).not.toContain("@scr_exc_pending");
        expect(llvm).not.toContain("@scr_exc_alert");
        expect(llvm).toMatch(
          /^@scr_exc_flag = external thread_local\(localexec\) global i32, align 4$/m,
        );
      }
    }
  },
);

test.each([
  ["arm64-apple-macosx14.0.0", "tpidrro"],
  ["x86_64-apple-macosx14.0.0", "gs"],
  ["x86_64-unknown-linux-gnu", "tls"],
])("worker stack checks for %s read the guard through %s", async (target, access) => {
  vi.stubEnv("SCRIPTC_TARGET", target);
  const request = await fixture(
    worker +
      "\nfunction depth(n: number): number { return n < 1 ? 0 : depth(n - 1) + 1; }\nconsole.log(depth(9));\n",
  );
  const result = await compile(request.entry, request);
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (result.ok) {
    const llvm = await readFile(request.outPath, "utf8");
    const start = llvm.search(/^define [^\n]*@sc_f_depth(?:\.i32)?\(/m);
    expect(start).toBeGreaterThanOrEqual(0);
    const depth = llvm.slice(start, llvm.indexOf("\n}\n", start));
    expect(depth).toContain("call ptr @llvm.stacksave.p0()");
    if (access === "tls") {
      // ELF: one thread-pointer-relative load of the thread-local guard.
      expect(depth).toContain("load ptr, ptr @scr_stack_guard");
      expect(depth).not.toContain("@scr_stack_guard_tsd");
    } else {
      // Darwin: a thread-local access calls the TLV thunk, so the guard comes
      // from its thread-specific-data slot, with an out-of-line fallback.
      expect(depth).not.toContain("ptr @scr_stack_guard\n");
      expect(depth).toContain("load i64, ptr @scr_stack_guard_tsd");
      expect(depth).toContain("call i64 @scr_stack_guard_get()");
      if (access === "tpidrro") {
        expect(depth).toContain('@llvm.read_register.i64(metadata !{!"tpidrro_el0"})');
      } else {
        expect(depth).toMatch(/load ptr, ptr addrspace\(256\) %/);
      }
    }
  }
});

test.each([
  ["x86_64-unknown-linux-gnu", true],
  ["aarch64-unknown-linux-gnu", true],
  ["arm64-apple-macosx14.0.0", false],
])("worker executables for %s use the executable TLS models: %s", async (target, models) => {
  vi.stubEnv("SCRIPTC_TARGET", target);
  const request = await fixture(worker + "\nlet count = 0;\ncount++;\nconsole.log(count);\n");
  const result = await compile(request.entry, request);
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (result.ok) {
    const llvm = await readFile(request.outPath, "utf8");
    // Every thread-local of a worker executable lives in its own TLS block
    // (the runtime links statically): ELF uses local-exec for the program's
    // and the runtime's; Darwin's thread-local variables have one model.
    const plain = /^@[-$._A-Za-z0-9]+ = (internal|external) thread_local global /m;
    if (models) {
      expect(llvm).not.toMatch(plain);
      expect(llvm).not.toContain("initialexec");
      expect(llvm).toMatch(/^@[-$._A-Za-z0-9]+ = internal thread_local\(localexec\) global /m);
      expect(llvm).toMatch(/^@[-$._A-Za-z0-9]+ = external thread_local\(localexec\) global /m);
    } else {
      expect(llvm).toMatch(plain);
      expect(llvm).not.toContain("thread_local(");
    }
  }
});

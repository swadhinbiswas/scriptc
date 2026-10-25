import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, expect, test } from "vitest";

const execFileAsync = promisify(execFile);
const require = createRequire(import.meta.url);
const repoRoot = join(import.meta.dirname, "../../..");
const cliEntry = join(repoRoot, "packages/cli/src/main.ts");
const tsxLoader = pathToFileURL(
  join(dirname(require.resolve("tsx/package.json")), "dist/loader.mjs"),
).href;
const dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), "scriptc-windows-subsystem-"));
  dirs.push(dir);
  const entry = join(dir, "app.ts");
  await writeFile(entry, 'console.log("subsystem");\n');
  return { dir, entry };
}

function cli(args: string[], env: NodeJS.ProcessEnv = process.env) {
  return execFileAsync(process.execPath, ["--import", tsxLoader, cliEntry, ...args], {
    env,
    maxBuffer: 4 * 1024 * 1024,
  });
}

async function peSubsystem(path: string): Promise<number> {
  const bytes = await readFile(path);
  expect(bytes.toString("ascii", 0, 2)).toBe("MZ");
  const peOffset = bytes.readUInt32LE(0x3c);
  expect(bytes.toString("ascii", peOffset, peOffset + 4)).toBe("PE\0\0");
  const optional = peOffset + 24;
  expect(bytes.readUInt16LE(optional)).toBe(0x20b);
  return bytes.readUInt16LE(optional + 68);
}

test("rejects the subsystem option outside Windows executable builds", async () => {
  const { dir, entry } = await fixture();
  const invalid = [
    ["build", entry, "--windows-subsystem=other"],
    ["build", entry, "--emit=llvm", "--windows-subsystem=gui"],
    ["build", entry, "--emit=obj", "--windows-subsystem=gui"],
    ["coverage", entry, "--windows-subsystem=gui"],
  ];
  for (const args of invalid) {
    await expect(cli(args)).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("--windows-subsystem"),
    });
  }
  await expect(
    cli(["build", entry, "--windows-subsystem=gui"], {
      ...process.env,
      SCRIPTC_TARGET: "wasm32-wasi",
    }),
  ).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining("requires a Windows executable target"),
  });
  await expect(readFile(join(dir, ".scriptc", "app.wasm"))).rejects.toMatchObject({
    code: "ENOENT",
  });
});

test.skipIf(process.platform !== "win32" && process.env["SCRIPTC_WIN_SUBSYSTEM"] !== "1")(
  "builds console and GUI PE executables without cross-subsystem cache hits",
  async () => {
    const { dir, entry } = await fixture();
    const env =
      process.platform === "win32"
        ? { ...process.env, SCRIPTC_CACHE_DIR: join(dir, "cache") }
        : {
            ...process.env,
            SCRIPTC_CC: "zigcc",
            SCRIPTC_TARGET: "x86_64-windows-gnu",
            SCRIPTC_CACHE_DIR: join(dir, "cache"),
            ZIG_GLOBAL_CACHE_DIR: join(dir, "zig-cache"),
          };
    const llvmOut = join(dir, "llvm.exe");
    const build = async (backend: "llvm", out: string, subsystem?: "console" | "gui") => {
      await cli(
        [
          "build",
          entry,
          `--backend=${backend}`,
          "-o",
          out,
          ...(subsystem === undefined ? [] : [`--windows-subsystem=${subsystem}`]),
        ],
        env,
      );
      return peSubsystem(out);
    };
    expect(await build("llvm", llvmOut)).toBe(3);
    expect(await build("llvm", llvmOut, "gui")).toBe(2);
    expect(await build("llvm", llvmOut)).toBe(3);
    expect(await build("llvm", llvmOut, "console")).toBe(3);
    if (process.platform === "win32") {
      expect((await execFileAsync(llvmOut)).stdout.trim()).toBe("subsystem");
    }
  },
  180_000,
);

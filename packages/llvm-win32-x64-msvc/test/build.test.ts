import { afterEach, expect, test, vi } from "vitest";

const commands = vi.hoisted(() => vi.fn());
vi.mock("node:child_process", () => ({ execFileSync: commands }));
vi.mock("node:fs", () => ({
  copyFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: () => JSON.stringify({ version: "0.1.7" }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
});

test("the Windows build enables every production object target", async () => {
  vi.stubGlobal("process", { ...process, platform: "win32", arch: "x64", env: {} });
  await import("../scripts/build.mjs");
  const configure = commands.mock.calls.find(([, args]) => args.includes("-S"));
  expect(configure?.[0]).toBe("cmake");
  const args = configure![1] as string[];
  expect(args.filter((arg) => arg.startsWith("-DSCRIPTC_TARGET_BACKENDS="))).toEqual([
    "-DSCRIPTC_TARGET_BACKENDS=AArch64;X86;WebAssembly",
  ]);
  const targets = args.filter((arg) => arg.startsWith("-DSCRIPTC_ALLOWED_TARGETS="));
  expect(targets).toHaveLength(1);
  expect(targets[0]!.split("=")[1]!.split(",")).toEqual(
    expect.arrayContaining([
      "x86_64-pc-windows-msvc",
      "x86_64-unknown-linux-gnu",
      "aarch64-unknown-linux-gnu",
      "wasm32-unknown-wasi",
      "arm64-apple-ios15.0.0",
      "aarch64-unknown-linux-android26",
    ]),
  );
});

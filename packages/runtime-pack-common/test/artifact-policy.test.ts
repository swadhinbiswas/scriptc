import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import {
  RUNTIME_COMPILE_FLAGS,
  assertArtifactsExcludeStrings,
  runtimeForbiddenStrings,
} from "../scripts/artifact-policy.mjs";

test("accepts artifacts whose imports stay within the declared libc floor", async () => {
  const root = await mkdtemp(join(tmpdir(), "scriptc-artifact-policy-"));
  try {
    await writeFile(join(root, "runtime.o"), Buffer.from("strtol\0__isoc99_sscanf\0"));
    await expect(
      assertArtifactsExcludeStrings(root, ["__isoc23_", "__ubsan_"]),
    ).resolves.toBeUndefined();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test.each([
  ["__isoc23_sscanf", "__isoc23_"],
  ["__ubsan_handle_add_overflow", "__ubsan_"],
])("rejects the %s import in nested runtime artifacts", async (symbol, family) => {
  const root = await mkdtemp(join(tmpdir(), "scriptc-artifact-policy-"));
  try {
    await mkdir(join(root, "release", "runtime"), { recursive: true });
    await writeFile(join(root, "release", "runtime", "scr_lib.o"), Buffer.from(`${symbol}\0`));
    await expect(assertArtifactsExcludeStrings(root, ["__isoc23_", "__ubsan_"])).rejects.toThrow(
      `runtime-pack artifact release/runtime/scr_lib.o contains forbidden symbol family ${family}`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("every pack compiles without UBSan and rejects its handlers", () => {
  expect(RUNTIME_COMPILE_FLAGS).toContain("-fno-sanitize=undefined");
  expect(runtimeForbiddenStrings()).toEqual(["__ubsan_"]);
  expect(runtimeForbiddenStrings(["__isoc23_", "__ubsan_"])).toEqual(["__ubsan_", "__isoc23_"]);
});

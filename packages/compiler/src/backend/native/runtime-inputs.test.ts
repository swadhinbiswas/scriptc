import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { afterEach, expect, test } from "vitest";
import { NATIVE_RECIPE_IMPLEMENTATION_PATHS } from "./runtime-inputs.js";

const execute = promisify(execFile);
const backend = fileURLToPath(new URL("..", import.meta.url));
const temporary: string[] = [];

afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

test("the recipe identity covers every native owner and retains the original recipes", async () => {
  const owners = (await readdir(join(backend, "native")))
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => join(backend, "native", name));
  expect(new Set(NATIVE_RECIPE_IMPLEMENTATION_PATHS).size).toBe(
    NATIVE_RECIPE_IMPLEMENTATION_PATHS.length,
  );
  expect(
    NATIVE_RECIPE_IMPLEMENTATION_PATHS.filter(
      (path) => dirname(path) === join(backend, "native"),
    ).sort(),
  ).toEqual(owners.sort());
  for (const name of ["native-toolchain.ts", "build-cache.ts", "vendor-archives.ts"]) {
    expect(NATIVE_RECIPE_IMPLEMENTATION_PATHS).toContain(join(backend, name));
  }
});

test("editing any recipe owner changes the fingerprint and every owner joins the dependency proof", async () => {
  const work = await mkdtemp(join(tmpdir(), "scriptc-recipe-identity-"));
  temporary.push(work);
  const native = join(work, "backend", "native");
  const runtime = join(work, "runtime", "src");
  await mkdir(native, { recursive: true });
  await mkdir(runtime, { recursive: true });
  await writeFile(join(work, "package.json"), '{"type":"module"}\n');
  await writeFile(join(runtime, "source.c"), "int recipe_identity_probe;\n");
  for (const source of NATIVE_RECIPE_IMPLEMENTATION_PATHS) {
    const destination = join(
      dirname(source) === join(backend, "native") ? native : dirname(native),
      basename(source),
    );
    await copyFile(source, destination);
  }
  await copyFile(join(backend, "vendor-inputs.ts"), join(dirname(native), "vendor-inputs.ts"));
  // A separate process imports the copied implementation so import.meta.url
  // exercises source-path resolution without modifying the running checkout.
  const moduleUrl = pathToFileURL(join(native, "runtime-inputs.ts")).href;
  const script = `
import { appendFile } from "node:fs/promises";
import { NATIVE_RECIPE_IMPLEMENTATION_PATHS as recipes, runtimeFingerprint, runtimeFingerprintInputPaths } from ${JSON.stringify(moduleUrl)};
const runtime = ${JSON.stringify(runtime)};
const dependencies = await runtimeFingerprintInputPaths(runtime);
let previous = await runtimeFingerprint(runtime);
const changed = [];
for (const recipe of recipes) {
  await appendFile(recipe, "\\n// recipe mutation probe\\n");
  const current = await runtimeFingerprint(runtime);
  changed.push(current !== previous && dependencies.includes(recipe));
  previous = current;
}
process.stdout.write(JSON.stringify(changed));
`;
  const { stdout } = await execute(
    process.execPath,
    ["--import", "tsx", "--input-type=module", "--eval", script],
    {
      cwd: fileURLToPath(new URL("../../../../..", import.meta.url)),
      env: { ...process.env, SCRIPTC_TEST_STABLE_TOOLCHAIN: "0" },
      timeout: 30_000,
    },
  );
  expect(JSON.parse(stdout)).toEqual(NATIVE_RECIPE_IMPLEMENTATION_PATHS.map(() => true));
});

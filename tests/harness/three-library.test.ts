import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { compileLibrary } from "@scriptc/compiler";
import { expect, test } from "vitest";

const fixture = join(import.meta.dirname, "../library-mode/wasm");
const hasClang = spawnSync("clang", ["--version"]).status === 0;
test.skipIf(!hasClang).each(["dev", "release"] as const)(
  "three.js sends animated geometry, materials and resource lifecycle to a native host in %s",
  async (optimization) => {
    const directory = await mkdtemp("/tmp/scriptc-three-library-");
    const sanitize = process.env["SCRIPTC_SAN"] === "1";
    try {
      const profile = JSON.parse(await readFile(join(fixture, "three.json"), "utf8"));
      const profilePath = join(directory, "profile.json");
      await writeFile(
        profilePath,
        JSON.stringify({
          ...profile,
          name: "three-native-embedding",
          entry: join(fixture, "three.mjs"),
          optimization,
        }),
      );
      const built = await compileLibrary({ profilePath, outDir: directory, sanitize });
      if (!built.ok)
        throw new Error(
          built.diagnostics
            .map((diagnostic) => `${diagnostic.code}: ${diagnostic.message}`)
            .join("\n"),
        );
      const binary = join(directory, "host");
      const linked = spawnSync(
        "clang",
        [
          "-std=c11",
          ...(sanitize ? ["-fsanitize=address,undefined"] : []),
          join(fixture, "three-native.c"),
          built.archivePath,
          "-lm",
          "-o",
          binary,
        ],
        { encoding: "utf8" },
      );
      expect(linked.status, linked.stderr).toBe(0);
      const actual = spawnSync(binary, [], { encoding: "utf8", timeout: 30_000 });
      expect(actual.status, actual.stderr).toBe(0);
      const reference = spawnSync(
        process.execPath,
        [
          "--no-warnings",
          "--input-type=module",
          "-e",
          `
      const events=[];
      for (const name of ["vertex","surface","resource"]) globalThis[name]=(...values)=>events.push([name,...values.map(value=>Number(value.toFixed(9)))]);
      const {frame,dispose}=await import(${JSON.stringify(join(fixture, "three.mjs"))});
      for (const time of [0,123,2000]) frame(time,1.5);
      dispose();
      console.log(JSON.stringify(events));
    `,
        ],
        { encoding: "utf8" },
      );
      expect(reference.status, reference.stderr).toBe(0);
      const events = JSON.parse(reference.stdout);
      expect(
        actual.stdout
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line)),
      ).toEqual([...events, ...events]);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
  600_000,
);

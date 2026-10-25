import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, test } from "vitest";
import { compileLibrary } from "../src/index.js";

const root = join(import.meta.dirname, "../../..");
const dirs: string[] = [];
const savedTarget = process.env["SCRIPTC_TARGET"];
const savedCompiler = process.env["SCRIPTC_CC"];
afterEach(async () => {
  if (savedTarget === undefined) delete process.env["SCRIPTC_TARGET"];
  else process.env["SCRIPTC_TARGET"] = savedTarget;
  if (savedCompiler === undefined) delete process.env["SCRIPTC_CC"];
  else process.env["SCRIPTC_CC"] = savedCompiler;
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

for (const [target, pack, platform] of [
  ["aarch64-apple-ios", "ios-arm64", "IOS"],
  ["aarch64-apple-ios-simulator", "ios-simulator-arm64", "IOSSIMULATOR"],
  ["aarch64-linux-android", "android-arm64", "ELF"],
] as const) {
  const available =
    existsSync(join(root, `packages/runtime-${pack}/runtime-pack.json`)) &&
    (platform === "ELF" || process.platform === "darwin");
  test.runIf(available).each(["release", "dev"] as const)(
    `${target} builds a localized per-thread library from packs (%s)`,
    async (optimization) => {
      const dir = await mkdtemp(join(tmpdir(), "scriptc-mobile-pack-"));
      dirs.push(dir);
      const fixture = join(root, "tests/library-mode/scalars");
      const profile = JSON.parse(await readFile(join(fixture, "profile.json"), "utf8"));
      profile.entry = join(fixture, "lib.ts");
      profile.optimization = optimization;
      profile.abi.localize_runtime = true;
      profile.abi.instance_per_thread = true;
      const profilePath = join(dir, "profile.json");
      await writeFile(profilePath, JSON.stringify(profile));
      process.env["SCRIPTC_TARGET"] = target;
      process.env["SCRIPTC_CC"] = "/unavailable/compiler";
      const result = await compileLibrary({ profilePath, outDir: dir });
      if (!result.ok)
        throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join("\n"));
      expect((await readFile(result.archivePath)).subarray(0, 8).toString()).toBe("!<arch>\n");
      if (platform !== "ELF") {
        const commands = execFileSync("otool", ["-l", result.archivePath], { encoding: "utf8" });
        expect(commands).toMatch(
          new RegExp(`platform (?:${platform}|${platform === "IOS" ? "2" : "7"})`),
        );
        expect(commands).toMatch(/minos 15\.0/);
      } else {
        const members = execFileSync("zig", ["ar", "t", result.archivePath], { encoding: "utf8" })
          .trim()
          .split("\n");
        expect(members).toHaveLength(1);
        const object = execFileSync("zig", ["ar", "p", result.archivePath, members[0]!], {
          maxBuffer: 64 * 1024 * 1024,
        });
        expect(object.subarray(0, 4)).toEqual(Buffer.from([0x7f, 0x45, 0x4c, 0x46]));
        expect(object.readUInt16LE(18)).toBe(183); // EM_AARCH64
      }
    },
  );
}

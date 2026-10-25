// statSync / lstatSync(path, options): throwIfNoEntry: false answers
// undefined for a missing entry (ENOENT) and for a path through a file
// (ENOTDIR), including a dangling link's stat; other options forms keep
// the throwing behavior. The module-resolution probes: isFile() and
// isDirectory() behind an undefined check, and optional chaining. A path
// with a null byte does not exist for existsSync.
import { existsSync, lstatSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import type { Stats } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { tmpdir } from "node:os";

const dir = mkdtempSync(join(tmpdir(), "scr-stat-probe-"));
const file = join(dir, "file.txt");
const sub = join(dir, "sub");
writeFileSync(file, "data");
mkdirSync(sub);
const dangling = join(dir, "dangling");
// symlinkSync has no lowering yet, so ask the Node binary to create the
// link. A Windows directory junction needs no symlink privilege.
execFileSync(
  "node",
  [
    "-e",
    "require('node:fs').symlinkSync(process.argv[1],process.argv[2],process.platform==='win32'?'junction':'dir')",
    join(dir, "gone"),
    dangling,
  ],
  { stdio: "pipe" },
);

function fileExists(path: string): boolean {
  const stat = statSync(path, { throwIfNoEntry: false });
  return stat !== undefined && stat.isFile();
}

function directoryExists(path: string): boolean {
  const stat = statSync(path, { throwIfNoEntry: false });
  return !!stat && stat.isDirectory();
}

function describe(stat: Stats | undefined): string {
  if (stat === undefined) return "undefined";
  return stat.isFile() ? "file" : stat.isDirectory() ? "directory" : "other";
}

function code(run: () => void): string {
  try {
    run();
    return "no throw";
  } catch (error) {
    const e = error as NodeJS.ErrnoException;
    return `${e.code} ${e.syscall} ${e.message.replace(dir, "<dir>")}`;
  }
}

console.log("fileExists", fileExists(file), fileExists(sub), fileExists(join(dir, "nope")));
console.log("directoryExists", directoryExists(sub), directoryExists(file), directoryExists(join(dir, "nope")));
console.log("through a file", describe(statSync(join(file, "x"), { throwIfNoEntry: false })));
console.log("missing parent", describe(statSync(join(dir, "a", "b"), { throwIfNoEntry: false })));
console.log("dangling stat", describe(statSync(dangling, { throwIfNoEntry: false })));
console.log("dangling lstat", lstatSync(dangling, { throwIfNoEntry: false })?.isSymbolicLink());
console.log("lstat missing", describe(lstatSync(join(dir, "nope"), { throwIfNoEntry: false })));
console.log("optional chain", statSync(file, { throwIfNoEntry: false })?.isFile(), statSync(join(dir, "nope"), { throwIfNoEntry: false })?.isFile());
console.log("size", statSync(file, { throwIfNoEntry: false })?.size);
console.log("existsSync null byte", existsSync(file), existsSync(`${file}\0x`));
console.log("bigint false", describe(statSync(sub, { bigint: false, throwIfNoEntry: false })));

// The throwing forms.
console.log("throwIfNoEntry true", code(() => statSync(join(dir, "nope"), { throwIfNoEntry: true })));
console.log("empty options", code(() => statSync(join(dir, "nope"), {})));
console.log("undefined options", code(() => lstatSync(join(dir, "nope"), undefined)));
console.log("plain", code(() => statSync(join(dir, "nope"))));

// A runtime-valued flag.
for (const flag of [false, true]) {
  console.log("flag", flag, code(() => console.log(describe(statSync(join(dir, "nope"), { throwIfNoEntry: flag })))));
}

// Stored options objects: the flag is read at each call.
const stored = { throwIfNoEntry: false };
const frozen = { throwIfNoEntry: false } as const;
console.log("stored", describe(statSync(join(dir, "nope"), stored)), describe(lstatSync(sub, frozen)));
stored.throwIfNoEntry = true;
console.log("stored true", code(() => statSync(join(dir, "nope"), stored)));

// Probes kept in a container and compared.
const probes: (Stats | undefined)[] = [file, sub, join(dir, "nope")].map((p) => statSync(p, { throwIfNoEntry: false }));
console.log("kept", probes.map(describe).join(" "), probes[2] === undefined);

rmSync(dir, { recursive: true, force: true });

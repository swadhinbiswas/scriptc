// fs/promises glob as a for await source: string matches, Dirent matches
// (fs/promises Dirents carry the resolved parent directory), the named,
// namespace and fs.promises spellings, early exits with break and continue,
// nested loops, and an error from an exclude callback surfacing at the
// loop.
import * as fs from "node:fs";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import * as fsp from "node:fs/promises";
import { glob } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "scriptc-fsp-glob-"));
for (const dir of ["one/deep", "two"]) mkdirSync(join(root, dir), { recursive: true });
for (const file of ["one/a.txt", "one/deep/b.txt", "two/c.txt", "two/d.md", "e.txt"]) {
  writeFileSync(join(root, file), "");
}

async function main(): Promise<void> {
  const all: string[] = [];
  for await (const path of glob("**/*.txt", { cwd: root })) all.push(path);
  console.log("named", all.join(" "));

  const viaNamespace: string[] = [];
  for await (const path of fsp.glob("*/*", { cwd: root, exclude: ["**/*.md"] })) viaNamespace.push(path);
  console.log("namespace", viaNamespace.join(" "));

  const viaFs: string[] = [];
  for await (const path of fs.promises.glob("two/*", { cwd: root })) viaFs.push(path);
  console.log("fs.promises", viaFs.join(" "));

  const rows: string[] = [];
  for await (const entry of glob("one/**", { cwd: root, withFileTypes: true })) {
    rows.push(`${entry.name}|${entry.parentPath.slice(root.length)}|${entry.isDirectory()}`);
  }
  console.log("dirents", rows.join(" "));

  let first = "";
  for await (const path of glob("**/*.txt", { cwd: root })) {
    first = path;
    break;
  }
  console.log("break", first);

  const skipped: string[] = [];
  for await (const path of glob("**/*.txt", { cwd: root })) {
    if (path.startsWith("one")) continue;
    skipped.push(path);
  }
  console.log("continue", skipped.join(" "));

  const pairs: string[] = [];
  for await (const dir of glob("*/", { cwd: root })) {
    for await (const file of glob(`${dir}/*.txt`, { cwd: root })) pairs.push(`${dir}>${file}`);
  }
  console.log("nested", pairs.join(" "));

  try {
    for await (const path of glob("**", {
      cwd: root,
      exclude: (p) => {
        if (p === "two") throw new Error(`refused ${p}`);
        return false;
      },
    })) {
      console.log("visited", path);
    }
  } catch (error) {
    console.log("caught", (error as Error).message);
  }
  rmSync(root, { recursive: true, force: true });
}

void main();

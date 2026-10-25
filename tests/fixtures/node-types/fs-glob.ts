/* fs.globSync, fs/promises glob and fs.glob under @types/node: the same
 * native walk as under the bundled declarations. */
import { type Dirent, glob as globCallback, globSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "scriptc-node-types-glob-"));
mkdirSync(join(root, "src/util"), { recursive: true });
for (const file of ["src/a.ts", "src/util/b.ts", "src/util/b.test.ts", "notes.md"]) writeFileSync(join(root, file), "");

console.log(globSync("**/*.ts", { cwd: root, exclude: ["**/*.test.ts"] }).join(" "));
const entries: Dirent[] = globSync("src/*", { cwd: root, withFileTypes: true });
console.log(entries.map((d) => `${d.name}:${d.isDirectory()}`).join(" "));

async function main(): Promise<void> {
  const found: string[] = [];
  for await (const path of glob("src/**", { cwd: root })) found.push(path);
  console.log(found.join(" "));
  globCallback("*.md", { cwd: root }, (err, matches) => {
    console.log(err, matches.join(" "));
    rmSync(root, { recursive: true, force: true });
  });
}

void main();

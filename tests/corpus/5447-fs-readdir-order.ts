// readdir lists names in byte order on POSIX hosts, as libuv's scandir
// sorts them: readdirSync with and without withFileTypes, and fs/promises
// readdir. The names are created out of order and include dot files, upper
// case, digits and non-ASCII so the byte order is visible. Windows keeps the
// directory's own order in both Node and scriptc, so the listings are
// compared sorted there.
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "scriptc-readdir-"));
for (const dir of ["zeta", "Alpha", "beta/inner", "beta/Inner2", "_under"]) {
  mkdirSync(join(root, dir), { recursive: true });
}
for (const file of ["b.txt", "a.txt", ".dot", "B.txt", "10.txt", "9.txt", "é.txt", "z.txt", "beta/z", "beta/a", "zeta/x"]) {
  writeFileSync(join(root, file), "");
}

const ordered = (list: string[]): string =>
  (process.platform === "win32" ? [...list].sort() : list).join(",");

console.log(ordered(readdirSync(root)));
console.log(ordered(readdirSync(join(root, "beta"))));
console.log(ordered(readdirSync(root, { withFileTypes: true }).map((d) => `${d.name}${d.isDirectory() ? "/" : ""}`)));

void readdir(root).then((listed) => {
  console.log(ordered(listed));
  rmSync(root, { recursive: true, force: true });
});

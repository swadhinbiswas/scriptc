import { appendFileSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const directory = process.argv[2]!;
process.chdir(directory);
console.log("cwd", process.cwd() === realpathSync.native(directory));
const name = "源-🌍.ts";
const file = join(directory, name);
writeFileSync(file, "héllo");
appendFileSync(file, " 世界");
console.log("read", readFileSync(file, "utf8"));
console.log("bytes", readFileSync(file).toString("utf8"));
console.log("stat", statSync(file).isFile(), statSync(directory).isDirectory());
console.log("names", readdirSync(directory).includes(name));
const entries = readdirSync(directory, { withFileTypes: true });
console.log("dirent", entries.some((entry) => entry.name === name && entry.isFile()));
console.log("realpath", realpathSync.native(file).endsWith(name));
for (const target of [file, join(directory, "missing")]) {
  try { readdirSync(target); console.log("unexpected"); }
  catch (error) { console.log("scan error", (error as NodeJS.ErrnoException).code); }
}

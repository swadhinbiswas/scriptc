import * as fs from "node:fs";
import { mkdtemp, readdir, stat, writeFile } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { promisify } from "node:util";

const mkdtempAsync = promisify(mkdtemp);
const writeFileAsync = promisify(writeFile);
const appendFileAsync = promisify(fs.appendFile);
const readFileAsync = promisify(fs.readFile);
const statAsync = promisify(stat);
const lstatAsync = promisify(fs.lstat);
const readdirAsync = promisify(readdir);
const mkdirAsync = promisify(fs.mkdir);
const renameAsync = promisify(fs.rename);
const copyFileAsync = promisify(fs.copyFile);
const unlinkAsync = promisify(fs.unlink);
const accessAsync = promisify(fs.access);
const symlinkAsync = promisify(fs.symlink);
const readlinkAsync = promisify(fs.readlink);
const realpathAsync = promisify(fs.realpath);
const chmodAsync = promisify(fs.chmod);
const truncateAsync = promisify(fs.truncate);
const rmAsync = promisify(fs.rm);
const rmdirAsync = promisify(fs.rmdir);
const linkAsync = promisify(fs.link);
const utimesAsync = promisify(fs.utimes);
const lutimesAsync = promisify(fs.lutimes);
const statfsAsync = promisify(fs.statfs);

const dir = await mkdtempAsync(join(tmpdir(), "scriptc-promisify-fs-"));
const file = join(dir, "a.txt");
await writeFileAsync(file, "hello");
await appendFileAsync(file, " world");
console.log("read:", await readFileAsync(file, "utf8"));
const s = await statAsync(file);
console.log("stat:", s.size, s.isFile(), s.isDirectory());
console.log("lstat:", (await lstatAsync(file)).isFile());
await mkdirAsync(join(dir, "sub", "deep"), { recursive: true });
await copyFileAsync(file, join(dir, "sub", "b.txt"));
await renameAsync(join(dir, "sub", "b.txt"), join(dir, "sub", "c.txt"));
console.log("readdir:", (await readdirAsync(join(dir, "sub"))).sort().join(","));
await symlinkAsync(file, join(dir, "link"));
console.log("readlink:", (await readlinkAsync(join(dir, "link"))) === file);
console.log("realpath:", (await realpathAsync(join(dir, "link"))).endsWith("a.txt"));
await chmodAsync(file, 0o600);
console.log("mode:", ((await statAsync(file)).mode & 0o777).toString(8));
await truncateAsync(file, 5);
console.log("truncated:", await readFileAsync(file, "utf8"));
await accessAsync(file);
console.log("access: ok");
await linkAsync(file, join(dir, "hard"));
console.log("nlink:", (await statAsync(file)).nlink);
await utimesAsync(file, 1000, 2000);
console.log("mtime:", (await statAsync(file)).mtimeMs);
await lutimesAsync(join(dir, "link"), 3000, 4000);
console.log("link mtime:", (await lstatAsync(join(dir, "link"))).mtimeMs);
console.log("statfs:", typeof (await statfsAsync(dir)).bsize);
await unlinkAsync(join(dir, "link"));
await unlinkAsync(join(dir, "hard"));
try {
  await statAsync(join(dir, "missing"));
} catch (e) {
  if (e instanceof Error) console.log("missing:", e.message.replace(dir, "<dir>"));
}
try {
  await accessAsync(join(dir, "missing"));
} catch (e) {
  if (e instanceof Error) console.log("access missing:", e.message.replace(dir, "<dir>"));
}
await rmdirAsync(join(dir, "sub", "deep"));
await rmAsync(file);
await rmAsync(join(dir, "sub", "c.txt"));
await rmdirAsync(join(dir, "sub"));
await rmdirAsync(dir);
console.log("removed:", fs.existsSync(dir));

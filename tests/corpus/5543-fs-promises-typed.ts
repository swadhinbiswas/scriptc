// The typed fs/promises and sync additions: access, appendFile (string and
// Uint8Array data), copyFile, mkdtemp, rmdir, truncate, chown, lchown and
// readFile with an encoding or { encoding }; truncateSync, lchownSync and
// fchownSync. Failures reject (or throw, for the sync forms) with Node's
// errors, including its access mode, uid/gid and len checks.
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fsp-typed-"));
const file = path.join(dir, "f.txt");
const missing = path.join(dir, "missing.txt");
// -1 leaves an owner unchanged.
const uid = -1;
const gid = -1;

function clean(text: string): string {
  return text.split(dir).join("<dir>").replace(/t-(?!XXXXXX)[A-Za-z0-9]{6}/g, "t-<name>");
}

function report(label: string, error: unknown): void {
  if (error instanceof Error) {
    const code = (error as NodeJS.ErrnoException).code;
    console.log(label, error.name, code, clean(error.message));
  } else {
    console.log(label, "non-error");
  }
}

async function settle(label: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
    console.log(label, "fulfilled");
  } catch (error) {
    report(label, error);
  }
}

function attempt(label: string, run: () => void): void {
  try {
    run();
    console.log(label, "ok");
  } catch (error) {
    report(label, error);
  }
}

fs.writeFileSync(file, "0123456789");
attempt("truncateSync", () => fs.truncateSync(file, 6));
console.log("size", fs.statSync(file).size);
attempt("truncateSync default", () => fs.truncateSync(file));
console.log("size", fs.statSync(file).size);
attempt("truncateSync 2.5", () => fs.truncateSync(file, 2.5));
attempt("truncateSync missing", () => fs.truncateSync(missing));
attempt("lchownSync", () => fs.lchownSync(file, uid, gid));
attempt("lchownSync -2", () => fs.lchownSync(file, -2, gid));
attempt("chownSync 0.5", () => fs.chownSync(file, uid, 0.5));
const fd = fs.openSync(file, "r");
attempt("fchownSync", () => fs.fchownSync(fd, uid, gid));
attempt("fchownSync uid", () => fs.fchownSync(fd, 4294967296, gid));
fs.closeSync(fd);
attempt("fchownSync fd", () => fs.fchownSync(2147483648, uid, gid));
attempt("accessSync 9", () => fs.accessSync(file, 9));
attempt("mkdtempSync missing", () => {
  fs.mkdtempSync(path.join(missing, "t-"));
});

await settle("access", () => fsp.access(file));
await settle("access R_OK", () => fsp.access(file, fs.constants.R_OK));
await settle("access missing", () => fsp.access(missing));
await settle("access 8", () => fsp.access(file, 8));
await settle("appendFile", () => fsp.appendFile(file, "abc"));
await settle("appendFile bytes", () => fsp.appendFile(file, new Uint8Array([100, 101])));
console.log("content", fs.readFileSync(file, "utf8"));
await settle("copyFile", () => fsp.copyFile(file, path.join(dir, "copy.txt")));
await settle("copyFile missing", () => fsp.copyFile(missing, path.join(dir, "copy2.txt")));
console.log("copy", fs.readFileSync(path.join(dir, "copy.txt"), "utf8"));
const made = await fsp.mkdtemp(path.join(dir, "t-"));
console.log("mkdtemp", made.length - dir.length, fs.statSync(made).isDirectory());
await settle("mkdtemp missing", async () => {
  await fsp.mkdtemp(path.join(missing, "t-"));
});
await settle("rmdir", () => fsp.rmdir(made));
await settle("rmdir again", () => fsp.rmdir(made));
await settle("rmdir file", () => fsp.rmdir(file));
await settle("truncate", () => fsp.truncate(file, 2));
console.log("content", fs.readFileSync(file, "utf8"));
await settle("truncate default", () => fsp.truncate(file));
console.log("size", fs.statSync(file).size);
await settle("truncate 0.5", () => fsp.truncate(file, 0.5));
await settle("truncate missing", () => fsp.truncate(missing, 0.5));
await settle("chown", () => fsp.chown(file, uid, gid));
await settle("lchown", () => fsp.lchown(file, -1, -1));
await settle("chown NaN", () => fsp.chown(file, NaN, gid));
await settle("lchown missing", () => fsp.lchown(missing, uid, gid));

fs.writeFileSync(file, "café");
console.log("readFile latin1", await fsp.readFile(file, "latin1"));
console.log("readFile hex", await fsp.readFile(file, { encoding: "hex" }));
console.log("readFile utf8", await fsp.readFile(file, { encoding: "utf8" }));
const encoding: BufferEncoding = "base64";
console.log("readFile variable", await fsp.readFile(file, encoding));
await settle("readFile missing", async () => {
  await fsp.readFile(missing, "latin1");
});

fs.rmSync(dir, { recursive: true });
console.log("removed", fs.existsSync(dir));

// A path with a null byte is refused before any file system access: the
// sync forms throw, the callback forms throw before the callback is
// scheduled, and the promise forms reject, each with Node's
// ERR_INVALID_ARG_VALUE TypeError naming the argument. existsSync answers
// false.
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const dir = fs.mkdtempSync(join(tmpdir(), "scr-nul-"));
const file = join(dir, "file.txt");
fs.writeFileSync(file, "data");
const bad = join(dir, "na\0me");

function check(label: string, run: () => void): void {
  try {
    run();
    console.log(label, "no throw");
  } catch (error) {
    const e = error as NodeJS.ErrnoException;
    console.log(label, e.name, e.code, e.message.replace(dir, "<dir>"));
  }
}

const never = (): void => {
  console.log("callback ran");
};

check("readFileSync", () => {
  fs.readFileSync(bad, "utf8");
});
check("readFileSync bytes", () => {
  fs.readFileSync(bad);
});
check("writeFileSync", () => {
  fs.writeFileSync(bad, "x");
});
check("appendFileSync", () => {
  fs.appendFileSync(bad, "x");
});
check("accessSync", () => {
  fs.accessSync(bad);
});
check("chmodSync", () => {
  fs.chmodSync(bad, 0o644);
});
check("mkdirSync", () => {
  fs.mkdirSync(bad);
});
check("mkdirSync recursive", () => {
  fs.mkdirSync(bad, { recursive: true });
});
check("mkdtempSync", () => {
  fs.mkdtempSync(bad);
});
check("rmSync", () => {
  fs.rmSync(bad, { force: true });
});
check("rmdirSync", () => {
  fs.rmdirSync(bad);
});
check("unlinkSync", () => {
  fs.unlinkSync(bad);
});
check("readdirSync", () => {
  fs.readdirSync(bad);
});
check("readdirSync types", () => {
  fs.readdirSync(bad, { withFileTypes: true });
});
check("statSync", () => {
  fs.statSync(bad);
});
check("lstatSync", () => {
  fs.lstatSync(bad);
});
check("realpathSync", () => {
  fs.realpathSync(bad);
});
check("realpathSync.native", () => {
  fs.realpathSync.native(bad);
});
check("truncateSync", () => {
  fs.truncateSync(bad, 0);
});
check("openSync", () => {
  fs.openSync(bad, "r");
});
check("opendirSync", () => {
  fs.opendirSync(bad);
});
check("readlinkSync", () => {
  fs.readlinkSync(bad);
});
check("renameSync oldPath", () => {
  fs.renameSync(bad, file);
});
check("renameSync newPath", () => {
  fs.renameSync(file, bad);
});
check("copyFileSync src", () => {
  fs.copyFileSync(bad, file);
});
check("copyFileSync dest", () => {
  fs.copyFileSync(file, bad);
});
check("linkSync existingPath", () => {
  fs.linkSync(bad, file);
});
check("linkSync newPath", () => {
  fs.linkSync(file, bad);
});
check("symlinkSync target", () => {
  fs.symlinkSync(bad, join(dir, "link"));
});
check("symlinkSync path", () => {
  fs.symlinkSync(file, bad);
});
check("utimesSync", () => {
  fs.utimesSync(bad, 1, 1);
});
check("lutimesSync", () => {
  fs.lutimesSync(bad, 1, 1);
});
check("createReadStream", () => {
  fs.createReadStream(bad);
});
check("createWriteStream", () => {
  fs.createWriteStream(bad);
});
check("statfsSync", () => {
  fs.statfsSync(bad);
});
console.log("existsSync", fs.existsSync(bad), fs.existsSync(`${file}\0x`), fs.existsSync(file));

check("readFile callback", () => {
  fs.readFile(bad, "utf8", never);
});
check("rename callback", () => {
  fs.rename(file, bad, never);
});

async function rejects(label: string, pending: Promise<void>): Promise<void> {
  try {
    await pending;
    console.log(label, "resolved");
  } catch (error) {
    const e = error as NodeJS.ErrnoException;
    console.log(label, e.name, e.code, e.message.replace(dir, "<dir>"));
  }
}

async function promises(): Promise<void> {
  await rejects("promises.readFile", fsp.readFile(bad, "utf8").then(() => undefined));
  await rejects("promises.writeFile", fsp.writeFile(bad, "x"));
  await rejects("promises.appendFile", fsp.appendFile(bad, "x"));
  await rejects("promises.stat", fsp.stat(bad).then(() => undefined));
  await rejects("promises.lstat", fsp.lstat(bad).then(() => undefined));
  await rejects("promises.mkdir", fsp.mkdir(bad).then(() => undefined));
  await rejects("promises.readdir", fsp.readdir(bad).then(() => undefined));
  await rejects("promises.unlink", fsp.unlink(bad));
  await rejects("promises.rmdir", fsp.rmdir(bad));
  await rejects("promises.rm", fsp.rm(bad));
  await rejects("promises.rename", fsp.rename(file, bad));
  await rejects("promises.copyFile", fsp.copyFile(bad, file));
  await rejects("promises.realpath", fsp.realpath(bad).then(() => undefined));
  await rejects("promises.access", fsp.access(bad));
  await rejects("promises.chmod", fsp.chmod(bad, 0o644));
  await rejects("promises.truncate", fsp.truncate(bad, 0));
  await rejects("promises.mkdtemp", fsp.mkdtemp(bad).then(() => undefined));
  await rejects("promises.opendir", fsp.opendir(bad).then(() => undefined));
  await rejects("promises.open", fsp.open(bad, "r").then(() => undefined));
}

// The inspected value: quotes chosen as util.inspect chooses them, control
// characters escaped, and the text cut at 128 characters.
check("quote", () => {
  fs.statSync("it's\0");
});
check("both quotes", () => {
  fs.statSync("a'b\"c\0");
});
check("escapes", () => {
  fs.statSync("é\0\n\t\x1b");
});
check("long", () => {
  fs.statSync("a".repeat(200) + "\0");
});

promises().then(() => fs.rmSync(dir, { recursive: true, force: true }));

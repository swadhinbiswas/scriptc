// fs.Stats fields: statSync, lstatSync and fstatSync expose mode, uid,
// gid, rdev, blksize, birthtimeMs, the Date fields (the *Ms values
// rounded) and every type test. The callback forms build Node's Stats and
// BigIntStats objects: own fields in the binding's order, lazy Date
// accessors that become own properties when read, and type tests that go
// through this._checkModeProperty and read this.mode.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const util = require("node:util");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fs-stats-"));
const file = path.join(dir, "f.txt");
fs.writeFileSync(file, "stats text");
const posix = process.platform !== "win32";

// The typed snapshot.
const s = fs.statSync(file);
console.log("type bits", (s.mode & 0o170000) === 0o100000, s.mode === fs.lstatSync(file).mode);
console.log("ids", s.uid >= 0, s.gid >= 0, s.rdev, s.blksize > 0, s.nlink, s.size, s.blocks >= 0);
console.log("tests", s.isFile(), s.isDirectory(), s.isSymbolicLink(), s.isBlockDevice(), s.isCharacterDevice(), s.isFIFO(), s.isSocket());
console.log("dates", s.atime.getTime() === Math.round(s.atimeMs), s.mtime.getTime() === Math.round(s.mtimeMs), s.ctime.getTime() === Math.round(s.ctimeMs), s.birthtime.getTime() === Math.round(s.birthtimeMs));
console.log("iso", s.mtime.toISOString() === new Date(Math.round(s.mtimeMs)).toISOString());
const d = fs.statSync(dir);
console.log("directory", d.isDirectory(), d.isFile(), (d.mode & 0o170000) === 0o040000);
const fd = fs.openSync(file, "r");
const f = fs.fstatSync(fd);
console.log("fstat", f.ino === s.ino, f.mode === s.mode, f.birthtimeMs === s.birthtimeMs, f.blksize === s.blksize);
fs.closeSync(fd);
if (posix) {
  const n = fs.statSync("/dev/null");
  console.log("char device", n.isCharacterDevice(), n.isFile(), n.rdev > 0, (n.mode & 0o170000) === 0o020000);
  fs.symlinkSync("f.txt", path.join(dir, "link"));
  const l = fs.lstatSync(path.join(dir, "link"));
  console.log("link", l.isSymbolicLink(), (l.mode & 0o170000) === 0o120000, l.size);
} else {
  console.log("device and link checks need POSIX");
}

const mask = (text) => text.replace(/\n */g, " ").replace(/\d+(\.\d+)?n?/g, "N");

// The callback objects.
fs.stat(file, (err, t) => {
  console.log("keys", err, Object.keys(t).join());
  const keys = [];
  for (const key in t) keys.push(key);
  console.log("for-in", keys.join());
  console.log("inspect", mask(util.inspect(t)));
  console.log("same snapshot", t.mode === s.mode, t.ino === s.ino, t.birthtimeMs === s.birthtimeMs, t.blksize === s.blksize);
  console.log("lazy", Object.keys(t).includes("mtime"), t.mtime === t.mtime, Object.keys(t).includes("mtime"));
  console.log("rounded", t.mtime.getTime() === Math.round(t.mtimeMs), t.birthtime.getTime() === s.birthtime.getTime());
  const own = Object.getOwnPropertyDescriptor(t, "mtime");
  console.log("own date", own.writable, own.enumerable, own.configurable);
  t.atime = 5;
  console.log("assigned", t.atime, Object.keys(t).slice(-2).join());
  const proto = Object.getPrototypeOf(t);
  console.log("prototypes", Object.getOwnPropertyNames(proto).join(), Object.getOwnPropertyNames(Object.getPrototypeOf(proto)).join());
  console.log("names", t.constructor.name, t.constructor.length, JSON.stringify(t.isFile.name), t.isFile.length);
  console.log("json", JSON.stringify(t).startsWith('{"dev":'), JSON.stringify(t).includes('"atime":5'));
  t.mode = 0o010644;
  console.log("mode read", t.isFIFO() === posix, t.isFile());
  t.mode = "x";
  console.log("odd mode", t.isFile());
  fs.lstat(file, { bigint: true }, (err2, b) => {
    console.log("bigint keys", err2, Object.keys(b).join());
    console.log("bigint inspect", mask(util.inspect(b)), b.constructor.name);
    console.log("bigint values", typeof b.mode, b.mode === BigInt(s.mode), b.ino === BigInt(s.ino), b.mtimeMs === b.mtimeNs / 1000000n);
    console.log("bigint dates", b.mtime.getTime() === Number(b.mtimeMs), b.isFile(), b.isDirectory());
    b.mode = 5;
    try {
      b.isFile();
    } catch (error) {
      console.log("mixed", error.name, error.message);
    }
    const { isFile } = b;
    try {
      isFile();
    } catch (error) {
      console.log("detached", error.name, error.message);
    }
    const handle = fs.openSync(file, "r");
    fs.fstat(handle, (err3, h) => {
      console.log("fstat callback", err3, h.isDirectory(), h.isFile(), h.ino === s.ino, h.mode === s.mode, h.birthtimeMs === s.birthtimeMs);
      fs.closeSync(handle);
      fs.rmSync(dir, { recursive: true });
      console.log("removed", fs.existsSync(dir));
    });
  });
});

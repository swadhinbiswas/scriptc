// The checks fs callback forms run before their request: mkdir, chmod,
// fchmod and open parse modes like Node's parseFileMode (octal strings
// included), mkdir's options.recursive must be a boolean, open's flags
// throw at the call, the fd forms check the fd after the callback, and
// read, write, readv and writev find a missing callback where Node does.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cb-checks-"));
const file = path.join(dir, "f.txt");
fs.writeFileSync(file, "abcdef");
const clean = (text) => text.split(dir).join("<dir>");
function t(label, run) {
  try {
    run();
    console.log(label, "accepted");
  } catch (error) {
    console.log(label, error.name, error.code, clean(error.message));
  }
}
const noop = () => {};
// The permission bits, read through the callback stat.
const bits = (target, label, error, next) =>
  fs.stat(target, (e, s) => next(label, error, (s.mode & 0o777).toString(8)));
const fd = fs.openSync(file, "r+");
t("mkdir options.recursive", () => fs.mkdir(path.join(dir, "a"), { recursive: "yes" }, noop));
t("mkdir options.mode", () => fs.mkdir(path.join(dir, "a"), { mode: "abc" }, noop));
t("mkdir mode 1.5", () => fs.mkdir(path.join(dir, "a"), 1.5, noop));
t("mkdir mode -1", () => fs.mkdir(path.join(dir, "a"), -1, noop));
t("chmod mode 1.5", () => fs.chmod(file, 1.5, noop));
t("chmod mode object", () => fs.chmod(file, {}, noop));
t("fchmod mode", () => fs.fchmod(fd, "x"));
t("ftruncate len", () => fs.ftruncate(fd, 1.5));
t("truncate len", () => fs.truncate(file, -0.5));
t("open bogus flags", () => fs.open(file, "bogus", noop));
t("open mode", () => fs.open(file, "r", 2 ** 32, noop));
t("fsync fd", () => fs.fsync(-1, noop));
t("fstat fd", () => fs.fstat(2 ** 31, noop));
t("close fd", () => fs.close(-1, noop));
t("fdatasync fd", () => fs.fdatasync(1.5, noop));
t("read no callback", () => fs.read(fd, Buffer.alloc(4), 0, 4, 0));
t("read options no callback", () => fs.read(fd, {}));
t("write no callback", () => fs.write(fd, Buffer.from("x")));
t("write offset no callback", () => fs.write(fd, Buffer.from("x"), 0));
t("readv no callback", () => fs.readv(fd, [Buffer.alloc(2)]));
t("writev position no callback", () => fs.writev(fd, [Buffer.from("x")], 0));
t("read params number", () => fs.read(fd, 5, noop));
t("read params array", () => fs.read(fd, [1], noop));
t("read options number", () => fs.read(fd, Buffer.alloc(2), 5, noop));

const steps = [
  (next) => fs.mkdir(path.join(dir, "octal"), "700", (e) => bits(path.join(dir, "octal"), "mkdir octal string", e, next)),
  (next) => fs.mkdir(path.join(dir, "deep/er"), { recursive: true, mode: "755" }, (e) => next("mkdir options", e, fs.existsSync(path.join(dir, "deep/er")))),
  (next) => fs.mkdir(path.join(dir, "plain"), {}, (e) => next("mkdir empty options", e, fs.existsSync(path.join(dir, "plain")))),
  (next) => fs.mkdir(path.join(dir, "null"), null, (e) => next("mkdir null options", e, fs.existsSync(path.join(dir, "null")))),
  (next) => fs.chmod(file, "640", (e) => bits(file, "chmod octal string", e, next)),
  (next) => fs.fchmod(fd, "600", (e) => bits(file, "fchmod octal string", e, next)),
  (next) =>
    fs.open(file, null, (e, n) => {
      fs.closeSync(n);
      next("open null flags", e, typeof n);
    }),
  (next) =>
    fs.open(path.join(dir, "new.txt"), "w", "600", (e, n) => {
      fs.closeSync(n);
      bits(path.join(dir, "new.txt"), "open octal mode", e, next);
    }),
  (next) => fs.read(fd, (e, n) => next("read fd only", e, n)),
  (next) => fs.read(fd, Buffer.alloc(3), (e, n, b) => next("read buffer", e, n, b.length)),
  (next) => fs.read(fd, null, (e, n, b) => next("read null params", e, n, b.length)),
  (next) => fs.read(fd, Buffer.alloc(4), { offset: 1, length: 2, position: 0 }, (e, n, b) => next("read options", e, n, JSON.stringify(b.toString("latin1")))),
  (next) => fs.close(fd, (e) => next("close", e)),
];
let index = 0;
function next(label, error, value, extra) {
  if (label !== undefined) console.log(label, error, value, extra);
  const step = steps[index++];
  if (step) step(next);
  else {
    fs.rmSync(dir, { recursive: true });
    console.log("removed", fs.existsSync(dir));
  }
}
next();

// fs callback forms find their callback where Node's signatures put it:
// a missing callback reports 'The "cb" argument ... Received undefined'
// instead of naming the last argument, optional arguments shift when the
// callback takes their place, and each form checks its callback in Node's
// order relative to its path, mode, flags and len.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cbfix-"));
const file = path.join(dir, "f.txt");
fs.writeFileSync(file, "data");
const clean = (text) => text.split(dir).join("<dir>");
function t(label, run) {
  try {
    run();
    console.log(label, "accepted");
  } catch (error) {
    console.log(label, error.code, clean(error.message));
  }
}
const fd = fs.openSync(file, "r+");
// No callback at all.
t("access", () => fs.access(file));
t("access mode", () => fs.access(file, 0));
t("copyFile", () => fs.copyFile(file, file + ".2"));
t("copyFile mode", () => fs.copyFile(file, file + ".2", 0));
t("chmod", () => fs.chmod(file, 0o644));
t("chown", () => fs.chown(file, -1, -1));
t("lchown", () => fs.lchown(file, -1, -1));
t("fchown", () => fs.fchown(fd, -1, -1));
t("mkdir", () => fs.mkdir(path.join(dir, "m")));
t("mkdir opts", () => fs.mkdir(path.join(dir, "m"), { recursive: true }));
t("mkdtemp", () => fs.mkdtemp(path.join(dir, "t-")));
t("rmdir", () => fs.rmdir(path.join(dir, "nope")));
t("unlink", () => fs.unlink(path.join(dir, "nope")));
t("open", () => fs.open(file));
t("open flags", () => fs.open(file, "r"));
t("open mode", () => fs.open(file, "r", 0o666));
t("fstat", () => fs.fstat(fd));
t("fstat opts", () => fs.fstat(fd, {}));
t("ftruncate", () => fs.ftruncate(fd));
t("ftruncate len", () => fs.ftruncate(fd, 4));
t("fsync", () => fs.fsync(fd));
t("fdatasync", () => fs.fdatasync(fd));
t("fchmod", () => fs.fchmod(fd, 0o644));
t("realpath", () => fs.realpath(file));
t("realpath opts", () => fs.realpath(file, {}));
t("stat", () => fs.stat(file));
t("stat opts", () => fs.stat(file, {}));
t("lstat", () => fs.lstat(file));
t("truncate", () => fs.truncate(file));
t("truncate len", () => fs.truncate(file, 4));
t("readFile", () => fs.readFile(file));
t("readFile opts", () => fs.readFile(file, "utf8"));
t("writeFile", () => fs.writeFile(file, "x"));
t("writeFile opts", () => fs.writeFile(file, "x", "utf8"));
t("appendFile", () => fs.appendFile(file, "x"));
t("readdir", () => fs.readdir(dir));
t("readdir opts", () => fs.readdir(dir, {}));
// A non-function where the callback goes.
t("unlink number", () => fs.unlink(file + ".nope", 5));
t("stat string", () => fs.stat(file, {}, "cb"));
t("readFile null", () => fs.readFile(file, "utf8", null));
// Validation order between the callback and the other arguments.
t("access bad path", () => fs.access(5));
t("chmod bad path", () => fs.chmod(5, 0o644));
t("chmod bad mode", () => fs.chmod(file, "abc"));
t("chown bad path", () => fs.chown(5, -1, -1));
t("unlink bad path", () => fs.unlink(5));
t("stat bad path", () => fs.stat(5));
t("mkdir bad path", () => fs.mkdir(5));
t("mkdir bad mode", () => fs.mkdir(file, "abc"));
t("open bad path", () => fs.open(5));
t("open bad flags", () => fs.open(file, "bogus"));
t("open bad mode", () => fs.open(file, "r", "abc"));
t("readFile bad path", () => fs.readFile(5));
t("writeFile bad path", () => fs.writeFile(5, "x"));
t("readdir bad path", () => fs.readdir(5));
t("realpath bad path", () => fs.realpath(5));
t("ftruncate bad fd", () => fs.ftruncate(-1));
t("fsync bad fd", () => fs.fsync(-1));
t("fstat bad fd", () => fs.fstat(-1));
t("copyFile bad src", () => fs.copyFile(5, file));
t("rmdir bad path", () => fs.rmdir(5));
t("truncate bad path", () => fs.truncate(5));
// Shifted callbacks still work.
const steps = [
  (next) => fs.access(file, (e) => next("access shifted", e)),
  (next) => fs.copyFile(file, file + ".3", (e) => next("copyFile shifted", e)),
  (next) => fs.mkdir(path.join(dir, "s"), (e) => next("mkdir shifted", e)),
  (next) => fs.mkdtemp(path.join(dir, "u-"), (e, p) => next("mkdtemp shifted", e, typeof p)),
  (next) => fs.rmdir(path.join(dir, "s"), (e) => next("rmdir shifted", e)),
  (next) =>
    fs.open(file, (e, n) => {
      fs.closeSync(n);
      next("open shifted", e, typeof n);
    }),
  (next) =>
    fs.open(file, "r", (e, n) => {
      fs.closeSync(n);
      next("open flags shifted", e, typeof n);
    }),
  (next) => fs.fstat(fd, (e, s) => next("fstat shifted", e, s.isFile())),
  (next) => fs.ftruncate(fd, (e) => next("ftruncate shifted", e)),
  (next) => fs.realpath(file, (e, p) => next("realpath shifted", e, clean(p))),
  (next) => fs.stat(file, (e, s) => next("stat shifted", e, s.size)),
  (next) => fs.truncate(file, (e) => next("truncate shifted", e)),
  (next) => fs.readFile(file, (e, b) => next("readFile shifted", e, b.length)),
  (next) => fs.writeFile(file, "yz", (e) => next("writeFile shifted", e)),
  (next) => fs.appendFile(file, "w", (e) => next("appendFile shifted", e, fs.readFileSync(file, "utf8"))),
  (next) => fs.readdir(dir, (e, names) => next("readdir shifted", e, names.length)),
  (next) => fs.close(fd, (e) => next("close", e)),
];
let index = 0;
function next(label, error, value) {
  if (label !== undefined) console.log(label, error, value);
  const step = steps[index++];
  if (step) step(next);
  else {
    fs.rmSync(dir, { recursive: true });
    console.log("removed", fs.existsSync(dir));
  }
}
next();

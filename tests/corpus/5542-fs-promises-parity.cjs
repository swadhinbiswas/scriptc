// fs/promises gains access, appendFile, copyFile, mkdtemp, rmdir, truncate,
// chown and lchown; fs gains truncateSync, lchownSync and fchownSync. All
// forms check access modes, uid/gid and len the way Node does (the
// callback forms throw those errors at the call), and truncate opens the
// path with 'r+' first, so a missing file reports open.
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fsp-parity-"));
const file = path.join(dir, "f.txt");
const missing = path.join(dir, "missing.txt");
// mkdtemp's random name is masked; a literal XXXXXX template stays visible.
const clean = (text) => text.split(dir).join("<dir>").replace(/t-(?!XXXXXX)[A-Za-z0-9]{6}/g, "t-<name>");
const show = (label, fn) => {
  try {
    console.log(label, fn());
  } catch (error) {
    console.log(label, error.name, error.code, clean(error.message));
  }
};
const settle = (label, promise) =>
  promise.then(
    (value) => console.log(label, "fulfilled", value),
    (error) => console.log(label, "rejected", error.name, error.code, error.syscall, clean(error.message)),
  );
const ids = process.platform === "win32" ? [0, 0] : [process.getuid(), process.getgid()];

fs.writeFileSync(file, "0123456789");
show("access 8", () => fs.accessSync(file, 8));
show("access -1", () => fs.accessSync(file, -1));
show("access NaN", () => fs.accessSync(file, NaN));
show("access F_OK", () => fs.accessSync(file, fs.constants.F_OK));
show("truncateSync", () => (fs.truncateSync(file, 4), fs.readFileSync(file, "utf8")));
show("truncateSync negative", () => (fs.truncateSync(file, -3), fs.statSync(file).size));
show("truncateSync default", () => (fs.writeFileSync(file, "abc"), fs.truncateSync(file), fs.statSync(file).size));
show("truncateSync 1.5", () => fs.truncateSync(file, 1.5));
show("truncateSync missing first", () => fs.truncateSync(missing, 1.5));
show("chownSync", () => fs.chownSync(file, ids[0], ids[1]));
show("lchownSync", () => fs.lchownSync(file, ids[0], ids[1]));
show("fchownSync", () => {
  const fd = fs.openSync(file, "r");
  try {
    return fs.fchownSync(fd, ids[0], ids[1]);
  } finally {
    fs.closeSync(fd);
  }
});
show("chownSync -2", () => fs.chownSync(file, -2, 0));
show("chownSync 1.5", () => fs.chownSync(file, 1.5, 0));
show("lchownSync gid", () => fs.lchownSync(file, -1, 4294967296));
show("fchownSync fd", () => fs.fchownSync(-1, 0, 0));
show("lchownSync missing", () => fs.lchownSync(missing, -1, -1));
show("mkdtempSync missing", () => fs.mkdtempSync(path.join(missing, "t-")));

// The callback forms.
const noop = () => {};
show("cb access 8", () => fs.access(file, 8, noop));
show("cb access string", () => fs.access(file, "1", noop));
show("cb chown 1.5", () => fs.chown(file, 1.5, 0, noop));
show("cb chown string", () => fs.chown(file, "1", 0, noop));
show("cb lchown -2", () => fs.lchown(file, -2, 0, noop));
show("cb fchown order", () => fs.fchown("x", 1.5, 0, noop));
show("cb fchown fd", () => fs.fchown(-1, 0, 0, noop));
show("cb truncate 1.5", () => fs.truncate(file, 1.5, noop));
show("cb truncate null", () => fs.truncate(file, null, noop));

(async () => {
  await new Promise((resolve) => fs.access(file, null, (error) => resolve(console.log("cb access null", error))));
  await new Promise((resolve) => fs.lchown(file, ids[0], ids[1], (error) => resolve(console.log("cb lchown", error))));
  await new Promise((resolve) => {
    const fd = fs.openSync(file, "r");
    fs.fchown(fd, ids[0], ids[1], (error) => {
      fs.closeSync(fd);
      resolve(console.log("cb fchown", error));
    });
  });
  await new Promise((resolve) =>
    fs.truncate(missing, -3, (error) => resolve(console.log("cb truncate missing", error.code, error.syscall))),
  );
  await new Promise((resolve) =>
    fs.mkdtemp(path.join(missing, "t-"), (error) => resolve(console.log("cb mkdtemp missing", error.code, clean(error.message)))),
  );
  fs.writeFileSync(file, "0123456789");
  await new Promise((resolve) =>
    fs.truncate(file, -3, (error) => resolve(console.log("cb truncate negative", error, fs.statSync(file).size))),
  );

  await settle("fsp access", fsp.access(file));
  await settle("fsp access W_OK", fsp.access(file, fs.constants.W_OK));
  await settle("fsp access missing", fsp.access(missing));
  await settle("fsp access 8", fsp.access(file, 8));
  await settle("fsp appendFile", fsp.appendFile(file, "ab"));
  await settle("fsp appendFile buffer", fsp.appendFile(file, Buffer.from("cd")));
  console.log("appended", fs.readFileSync(file, "utf8"));
  await settle("fsp appendFile new", fsp.appendFile(path.join(dir, "new.txt"), "fresh"));
  await settle("fsp copyFile", fsp.copyFile(file, path.join(dir, "copy.txt")));
  console.log("copied", fs.readFileSync(path.join(dir, "copy.txt"), "utf8"));
  await settle("fsp copyFile missing", fsp.copyFile(missing, path.join(dir, "copy2.txt")));
  const made = await fsp.mkdtemp(path.join(dir, "t-"));
  console.log("fsp mkdtemp", made.startsWith(path.join(dir, "t-")), made.length - path.join(dir, "t-").length, fs.statSync(made).isDirectory());
  await settle("fsp mkdtemp missing", fsp.mkdtemp(path.join(missing, "t-")));
  await settle("fsp rmdir", fsp.rmdir(made));
  console.log("rmdir gone", fs.existsSync(made));
  await settle("fsp rmdir not empty", fsp.rmdir(dir));
  await settle("fsp rmdir file", fsp.rmdir(file));
  await settle("fsp truncate", fsp.truncate(file, 3));
  console.log("truncated", fs.readFileSync(file, "utf8"));
  await settle("fsp truncate default", fsp.truncate(file));
  console.log("emptied", fs.statSync(file).size);
  await settle("fsp truncate 1.5", fsp.truncate(file, 1.5));
  await settle("fsp truncate missing first", fsp.truncate(missing, 1.5));
  await settle("fsp chown", fsp.chown(file, ids[0], ids[1]));
  await settle("fsp lchown", fsp.lchown(file, ids[0], ids[1]));
  await settle("fsp chown 1.5", fsp.chown(file, 1.5, 0));
  await settle("fsp lchown gid", fsp.lchown(file, 0, -2));
  await settle("fsp chown missing", fsp.chown(missing, -1, -1));
  fs.rmSync(dir, { recursive: true });
  console.log("removed", fs.existsSync(dir));
})();

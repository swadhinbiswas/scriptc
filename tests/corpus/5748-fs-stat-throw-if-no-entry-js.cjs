// The throwIfNoEntry: false probes in JavaScript, written the way a type
// checker's file-system host writes them: fileExists and directoryExists
// over statSync with a stored options object (read at each call),
// realpathSync and realpathSync.native, and readdirSync withFileTypes.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scr-stat-probe-js-"));
fs.mkdirSync(path.join(dir, "node_modules", "pkg", "lib"), { recursive: true });
fs.writeFileSync(path.join(dir, "node_modules", "pkg", "package.json"), "{}");
fs.writeFileSync(path.join(dir, "node_modules", "pkg", "lib", "index.d.ts"), "export {};");

// One stored options object, read at each call.
const statSyncOptions = { throwIfNoEntry: false };
function statSync(p) {
  return fs.statSync(p, statSyncOptions);
}

function fileSystemEntryExists(p, entryKind) {
  const stat = statSync(p);
  if (!stat) {
    return false;
  }
  switch (entryKind) {
    case 0:
      return stat.isFile();
    case 1:
      return stat.isDirectory();
    default:
      return false;
  }
}

function fileExists(p) {
  return fileSystemEntryExists(p, 0);
}

function directoryExists(p) {
  const stat = fs.statSync(p, { throwIfNoEntry: false });
  return !!stat && stat.isDirectory();
}

const modules = path.join(dir, "node_modules");
for (const name of ["pkg", "missing"]) {
  const candidates = [".ts", ".tsx", ".d.ts", "/package.json", "/lib/index.d.ts"];
  const found = candidates.filter((ext) => fileExists(path.join(modules, name + ext)));
  console.log(name, directoryExists(path.join(modules, name)), found.join(","));
}
console.log("through a file", fs.statSync(path.join(modules, "pkg", "package.json", "x"), { throwIfNoEntry: false }) === undefined);
console.log("lstat", fs.lstatSync(path.join(modules, "nope"), { throwIfNoEntry: false }) === undefined);
console.log("realpath", fs.realpathSync(path.join(modules, "pkg", "lib", "..")) === fs.realpathSync(path.join(modules, "pkg")));
console.log("realpath.native", fs.realpathSync.native(path.join(modules, "pkg", "lib", "..")) === fs.realpathSync(path.join(modules, "pkg")));

const entries = fs.readdirSync(path.join(modules, "pkg"), { withFileTypes: true });
for (const entry of entries) {
  console.log(entry.name, entry.isFile(), entry.isDirectory(), entry.isSymbolicLink());
}

try {
  fs.statSync(path.join(modules, "nope"), { throwIfNoEntry: true });
} catch (error) {
  console.log("throws", error.code, error.syscall);
}
try {
  fs.lstatSync(path.join(modules, "nope"), {});
} catch (error) {
  console.log("throws", error.code, error.syscall);
}

// The stored flag is read at each call.
statSyncOptions.throwIfNoEntry = true;
try {
  statSync(path.join(modules, "nope"));
} catch (error) {
  console.log("stored flag true throws", error.code);
}

fs.rmSync(dir, { recursive: true, force: true });

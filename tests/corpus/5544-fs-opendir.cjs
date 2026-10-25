// fs.opendirSync and fs/promises.opendir return a Dir: readSync and read
// walk the directory one Dirent at a time (name, parentPath and the type
// tests) until null, path reports the opened path, close and closeSync end
// it, and a closed Dir throws (or rejects with) ERR_DIR_CLOSED. Open
// failures carry no path, and options.bufferSize is checked after the
// directory opens.
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "opendir-"));
fs.writeFileSync(path.join(dir, "b.txt"), "b");
fs.mkdirSync(path.join(dir, "a"));
fs.writeFileSync(path.join(dir, "c.txt"), "c");
const clean = (text) => text.split(dir).join("<dir>");

const d = fs.opendirSync(dir);
console.log("path", clean(d.path));
const seen = [];
for (let entry = d.readSync(); entry !== null; entry = d.readSync()) {
  seen.push([entry.name, clean(entry.parentPath), entry.isFile(), entry.isDirectory(), entry.isSymbolicLink()].join(" "));
}
console.log("readSync", seen.sort().join(" | "));
console.log("at the end", d.readSync());
d.closeSync();
try {
  d.readSync();
} catch (error) {
  console.log("closed", error.name, error.code, error.message);
}
try {
  d.closeSync();
} catch (error) {
  console.log("closed twice", error.code);
}
try {
  fs.opendirSync(path.join(dir, "missing"));
} catch (error) {
  console.log("missing", error.code, error.syscall, error.path, clean(error.message));
}
try {
  fs.opendirSync(path.join(dir, "b.txt"));
} catch (error) {
  console.log("not a directory", error.code, error.syscall);
}
try {
  fs.opendirSync(dir, { bufferSize: 0 });
} catch (error) {
  console.log("bufferSize 0", error.code, error.message);
}
try {
  fs.opendirSync(dir, { bufferSize: 1.5 });
} catch (error) {
  console.log("bufferSize 1.5", error.code, error.message);
}
try {
  fs.opendirSync(path.join(dir, "missing"), { bufferSize: 0 });
} catch (error) {
  console.log("missing first", error.code);
}
const pass = (value) => value;
const passed = pass(fs.opendirSync(dir));
console.log("passed path", clean(passed.path));
passed.closeSync();
try {
  passed.closeSync();
} catch (error) {
  console.log("passed closed twice", error.code);
}
const small = fs.opendirSync(dir, { bufferSize: 1, encoding: "utf8" });
let count = 0;
while (small.readSync() !== null) count++;
console.log("bufferSize 1", count);
small.closeSync();

async function promises() {
  const handle = await fsp.opendir(dir, { bufferSize: 2 });
  console.log("promise path", clean(handle.path));
  const names = [];
  for (let entry = await handle.read(); entry !== null; entry = await handle.read()) names.push(entry.name);
  console.log("promise read", names.sort().join());
  await handle.close();
  try {
    await handle.close();
  } catch (error) {
    console.log("promise close twice", error.code);
  }
  try {
    await handle.read();
  } catch (error) {
    console.log("promise read closed", error.code);
  }
  try {
    await fsp.opendir(path.join(dir, "missing"));
  } catch (error) {
    console.log("promise missing", error.code, error.syscall);
  }
  const iterated = [];
  const loopDir = await fsp.opendir(dir);
  for await (const entry of loopDir) iterated.push(`${entry.name}:${entry.isDirectory()}`);
  console.log("for await", iterated.sort().join());
  try {
    loopDir.closeSync();
  } catch (error) {
    console.log("closed after for await", error.code);
  }
  const early = fs.opendirSync(dir);
  for await (const entry of early) {
    console.log("first", typeof entry.name);
    break;
  }
  try {
    early.readSync();
  } catch (error) {
    console.log("closed after break", error.code);
  }
  const thrower = fs.opendirSync(dir);
  try {
    for await (const entry of thrower) throw new Error(`stop at ${typeof entry.name}`);
  } catch (error) {
    console.log("thrown", error.message);
  }
  try {
    thrower.closeSync();
  } catch (error) {
    console.log("closed after throw", error.code);
  }
  const closing = fs.opendirSync(dir);
  let bodies = 0;
  try {
    for await (const entry of closing) {
      bodies++;
      if (entry.name) closing.closeSync();
    }
  } catch (error) {
    console.log("closed in the body", bodies, error.code);
  }
  fs.rmSync(dir, { recursive: true });
  console.log("removed", fs.existsSync(dir));
}
promises();

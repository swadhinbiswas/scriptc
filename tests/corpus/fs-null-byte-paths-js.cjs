// A path with a null byte in JavaScript: the sync forms throw, the callback
// forms throw before the callback is scheduled, and the promise forms
// reject, each with Node's ERR_INVALID_ARG_VALUE TypeError.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scr-nul-js-"));
const file = path.join(dir, "file.txt");
fs.writeFileSync(file, "data");
const bad = path.join(dir, "na\0me");

function show(label, error) {
  console.log(label, error.name, error.code, error.message.replace(dir, "<dir>"));
}
function attempt(label, run) {
  try {
    run();
    console.log(label, "no throw");
  } catch (error) {
    show(label, error);
  }
}
function never() {
  console.log("callback ran");
}

attempt("readFileSync", () => { fs.readFileSync(bad, "utf8"); });
attempt("writeFileSync", () => { fs.writeFileSync(bad, "x"); });
attempt("statSync", () => { fs.statSync(bad); });
attempt("lstatSync", () => { fs.lstatSync(bad); });
attempt("mkdirSync", () => { fs.mkdirSync(bad); });
attempt("readdirSync", () => { fs.readdirSync(bad); });
attempt("renameSync", () => { fs.renameSync(file, bad); });
attempt("copyFileSync", () => { fs.copyFileSync(file, bad); });
attempt("realpathSync", () => { fs.realpathSync(bad); });
attempt("unlinkSync", () => { fs.unlinkSync(bad); });
attempt("openSync", () => { fs.openSync(bad, "r"); });
attempt("createReadStream", () => { fs.createReadStream(bad); });
attempt("createWriteStream", () => { fs.createWriteStream(bad); });
console.log("existsSync", fs.existsSync(bad), fs.existsSync(file + "\0x"), fs.existsSync(file));

attempt("readFile", () => { fs.readFile(bad, "utf8", never); });
attempt("writeFile", () => { fs.writeFile(bad, "x", never); });
attempt("stat", () => { fs.stat(bad, never); });
attempt("lstat", () => { fs.lstat(bad, never); });
attempt("mkdir", () => { fs.mkdir(bad, never); });
attempt("readdir", () => { fs.readdir(bad, never); });
attempt("unlink", () => { fs.unlink(bad, never); });
attempt("rename", () => { fs.rename(file, bad, never); });
attempt("copyFile", () => { fs.copyFile(bad, file, never); });
attempt("access", () => { fs.access(bad, never); });
attempt("open", () => { fs.open(bad, "r", never); });
attempt("realpath", () => { fs.realpath(bad, never); });
attempt("mkdtemp", () => { fs.mkdtemp(bad, never); });

async function promises() {
  try {
    await fs.promises.readFile(bad, "utf8");
    console.log("promises.readFile", "resolved");
  } catch (error) {
    show("promises.readFile", error);
  }
  try {
    await fs.promises.stat(bad);
    console.log("promises.stat", "resolved");
  } catch (error) {
    show("promises.stat", error);
  }
  try {
    await fs.promises.mkdir(bad);
    console.log("promises.mkdir", "resolved");
  } catch (error) {
    show("promises.mkdir", error);
  }
  try {
    await fs.promises.rename(bad, file);
    console.log("promises.rename", "resolved");
  } catch (error) {
    show("promises.rename", error);
  }
  try {
    await fs.promises.open(bad, "r");
    console.log("promises.open", "resolved");
  } catch (error) {
    show("promises.open", error);
  }
}

promises().then(() => fs.rmSync(dir, { recursive: true, force: true }));

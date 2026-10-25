// fs's getOptions: null, undefined and functions take the defaults, a
// string is the encoding, other non-objects throw ERR_INVALID_ARG_TYPE, and
// assertEncoding lets 'buffer' through. readFile and readFileSync then read
// before buffer.toString('buffer') throws ERR_UNKNOWN_ENCODING (an empty
// file answers ""), and mkdtemp's callback answers its path in the
// requested encoding: a Buffer for 'buffer', re-encoded text otherwise.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "options-encoding-"));
const file = path.join(dir, "f.txt");
const empty = path.join(dir, "empty.txt");
fs.writeFileSync(file, "hi");
fs.writeFileSync(empty, "");
const prefix = path.join(dir, "t-");
const clean = (text) => String(text).split(dir).join("<dir>");
const describe = (value) =>
  Buffer.isBuffer(value) ? `Buffer ${clean(value.toString())}` : `${typeof value} ${clean(value)}`;
const show = (label, fn) => {
  try {
    console.log(label, "->", describe(fn()));
  } catch (error) {
    console.log(label, "throws", error.name, error.code, clean(error.message));
  }
};

for (const options of [5, 0, true, false, 10n, Symbol("s")]) {
  show(`readFile ${typeof options}`, () => fs.readFile(file, options, () => {}));
  show(`mkdtemp ${typeof options}`, () => fs.mkdtemp(prefix, options, () => {}));
  show(`mkdtempSync ${typeof options}`, () => fs.mkdtempSync(prefix, options));
}
show("mkdtemp bad encoding", () => fs.mkdtemp(prefix, { encoding: "nope" }, () => {}));
show("mkdtemp bad string", () => fs.mkdtemp(prefix, "nope", () => {}));
show("mkdtempSync empty string", () => fs.statSync(fs.mkdtempSync(prefix, "")).isDirectory());
show("mkdtempSync NaN encoding", () => fs.statSync(fs.mkdtempSync(prefix, { encoding: NaN })).isDirectory());
show("readFileSync buffer", () => fs.readFileSync(file, "buffer"));
show("readFileSync buffer object", () => fs.readFileSync(file, { encoding: "buffer" }));
show("readFileSync buffer empty", () => fs.readFileSync(empty, "buffer"));
show("readFileSync buffer missing", () => fs.readFileSync(path.join(dir, "missing"), "buffer"));

const steps = [
  (next) => fs.readFile(file, { encoding: "buffer" }, (error, data) => {
    console.log("readFile buffer", error && `${error.name} ${error.code} ${error.message}`, data);
    next();
  }),
  (next) => fs.readFile(file, "buffer", (error, data) => {
    console.log("readFile buffer string", error && error.code, data);
    next();
  }),
  (next) => fs.readFile(empty, "buffer", (error, data) => {
    console.log("readFile buffer empty", error, JSON.stringify(data));
    next();
  }),
  (next) => fs.readFile(path.join(dir, "missing"), { encoding: "buffer" }, (error, data) => {
    console.log("readFile buffer missing", error && error.code, data);
    next();
  }),
  (next) => fs.readFile(file, { encoding: "buffer", flag: "r+" }, (error, data) => {
    console.log("readFile buffer flag", error && error.code, data);
    next();
  }),
  (next) => fs.mkdtemp(prefix, { encoding: "buffer" }, (error, made) => {
    console.log("mkdtemp buffer", error, describe(made).startsWith(`Buffer ${clean(prefix)}`), fs.existsSync(made.toString()));
    next();
  }),
  (next) => fs.mkdtemp(prefix, "buffer", (error, made) => {
    console.log("mkdtemp buffer string", error, Buffer.isBuffer(made), made.length === prefix.length + 6);
    next();
  }),
  (next) => fs.mkdtemp(prefix, "hex", (error, made) => {
    const decoded = Buffer.from(made, "hex").toString();
    console.log("mkdtemp hex", error, typeof made, decoded.startsWith(prefix), fs.existsSync(decoded));
    next();
  }),
  (next) => fs.mkdtemp(prefix, { encoding: "base64" }, (error, made) => {
    const decoded = Buffer.from(made, "base64").toString();
    console.log("mkdtemp base64", error, decoded.startsWith(prefix), fs.existsSync(decoded));
    next();
  }),
  (next) => fs.mkdtemp(prefix, { encoding: "latin1" }, (error, made) => {
    console.log("mkdtemp latin1", error, made.startsWith(prefix));
    next();
  }),
  (next) => fs.mkdtemp(prefix, { encoding: "utf8" }, (error, made) => {
    console.log("mkdtemp utf8", error, typeof made, made.startsWith(prefix));
    next();
  }),
  (next) => fs.mkdtemp(path.join(dir, "missing", "t-"), { encoding: "buffer" }, (error, made) => {
    console.log("mkdtemp buffer missing", error && error.code, made);
    next();
  }),
];
const run = (index) => {
  if (index < steps.length) return steps[index](() => run(index + 1));
  fs.rmSync(dir, { recursive: true });
  console.log("removed", fs.existsSync(dir));
};
run(0);

// fs callback forms that pass results: mkdir with { recursive: true }
// gives the first directory it creates (spelled as Node cuts the path, or
// undefined when everything exists), readFile honors options.flag
// ('w+' truncates, 'a+' and 'r+' read), and write takes a string with an
// optional position and encoding, reporting the bytes written and the
// string. Invalid data, buffers and encodings throw at the call.
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fs-cb-"));
process.chdir(dir);

function step(i) {
  const steps = [
    () => fs.mkdir("a/b/c", { recursive: true }, (e, p) => (console.log("mkdir", e, p), step(i + 1))),
    () => fs.mkdir("a/b/c", { recursive: true }, (e, p) => (console.log("mkdir again", e, p), step(i + 1))),
    () => fs.mkdir("a/b/d/e/", { recursive: true }, (e, p) => (console.log("trailing", e, p), step(i + 1))),
    () => fs.mkdir("./x//y", { recursive: true }, (e, p) => (console.log("doubled", e, p), step(i + 1))),
    () => fs.mkdir(path.join(dir, "abs/q"), { recursive: true }, (e, p) => (console.log("absolute", e, p === path.join(dir, "abs")), step(i + 1))),
    () => fs.mkdir("plain", (e, p) => (console.log("non-recursive", e, p), step(i + 1))),
    () => {
      fs.writeFileSync("f.txt", "file text");
      fs.mkdir("f.txt/sub", { recursive: true }, (e, p) => (console.log("under a file", e.code, p), step(i + 1)));
    },
    () => fs.readFile("f.txt", { encoding: "utf8", flag: "r" }, (e, t) => (console.log("flag r", e, t), step(i + 1))),
    () => fs.readFile("f.txt", { encoding: "utf8", flag: "a+" }, (e, t) => (console.log("flag a+", e, t), step(i + 1))),
    () => fs.readFile("f.txt", { flag: "r+" }, (e, b) => (console.log("flag r+", e, b.toString()), step(i + 1))),
    () => fs.readFile("new.txt", { encoding: "utf8", flag: "a+" }, (e, t) => (console.log("flag a+ creates", e, JSON.stringify(t), fs.existsSync("new.txt")), step(i + 1))),
    () => fs.readFile("f.txt", { encoding: "utf8", flag: "w+" }, (e, t) => (console.log("flag w+", e, JSON.stringify(t), fs.statSync("f.txt").size), step(i + 1))),
    () => fs.readFile("missing.txt", { encoding: "utf8", flag: "r+" }, (e) => (console.log("flag r+ missing", e.code), step(i + 1))),
    () => {
      const fd = fs.openSync("w.txt", "w+");
      fs.write(fd, "hello", (e, n, s) => {
        console.log("write string", e, n, s);
        fs.write(fd, "WORLD", 0, (e2, n2) => {
          console.log("write at 0", e2, n2, fs.readFileSync("w.txt", "utf8"));
          fs.write(fd, "686921", 5, "hex", (e3, n3, s3) => {
            console.log("write hex", e3, n3, s3, fs.readFileSync("w.txt", "latin1"));
            fs.write(fd, "é", null, "latin1", (e4, n4) => {
              console.log("write latin1", e4, n4, fs.readFileSync("w.txt").length);
              fs.closeSync(fd);
              step(i + 1);
            });
          });
        });
      });
    },
    () => {
      const fd = fs.openSync("w.txt", "r+");
      try {
        fs.write(fd, "abc", 0, "hex", () => {});
      } catch (error) {
        console.log("odd hex", error.code, error.message);
      }
      try {
        fs.write(fd, 42, () => {});
      } catch (error) {
        console.log("bad data", error.code, error.message);
      }
      try {
        fs.read(fd, { buffer: 5 }, () => {});
      } catch (error) {
        console.log("bad read buffer", error.code, error.message);
      }
      fs.closeSync(fd);
      step(i + 1);
    },
  ];
  if (i < steps.length) steps[i]();
  else {
    process.chdir(os.tmpdir());
    fs.rmSync(dir, { recursive: true });
    console.log("removed", fs.existsSync(dir));
  }
}
step(0);

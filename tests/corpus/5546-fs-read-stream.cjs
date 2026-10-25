// fs.createReadStream: event order, chunking by highWaterMark, start/end,
// encodings, bytesRead/path/pending, open errors and option checks.
const fs = require("fs");
const os = require("os");
const path = require("path");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scr-rs-"));
const file = path.join(dir, "data.txt");
fs.writeFileSync(file, "abcdefghijklmnopqrstuvwxyz0123456789");

function run(label, opts) {
  return new Promise((resolve) => {
    const log = [];
    const rs = fs.createReadStream(file, opts);
    log.push(`pending=${rs.pending} bytesRead=${rs.bytesRead} path=${rs.path === file}`);
    rs.on("open", (fd) => log.push(`open ${typeof fd}`));
    rs.on("ready", () => log.push("ready"));
    rs.on("data", (chunk) =>
      log.push(`data ${typeof chunk === "string" ? JSON.stringify(chunk) : `<${chunk.length}> ${chunk.toString()}`}`),
    );
    rs.on("end", () => log.push(`end bytesRead=${rs.bytesRead}`));
    rs.on("error", (err) => log.push(`error ${err.code} ${err.syscall}`));
    rs.on("close", () => {
      log.push(`close pending=${rs.pending} destroyed=${rs.destroyed}`);
      console.log(label);
      for (const l of log) console.log(`  ${l}`);
      resolve(0);
    });
  });
}

function check(label, fn) {
  try {
    fn();
    console.log(label, "ok");
  } catch (err) {
    console.log(label, err.name, err.code, err.message);
  }
}

(async () => {
  await run("default", undefined);
  await run("hwm 10", { highWaterMark: 10 });
  await run("start 5 end 14 hwm 4", { start: 5, end: 14, highWaterMark: 4 });
  await run("end 0", { end: 0 });
  await run("utf8 string", "utf8");
  await run("hex", { encoding: "hex", highWaterMark: 8 });
  await new Promise((resolve) => {
    const rs = fs.createReadStream(path.join(dir, "nope.txt"));
    rs.on("error", (err) => console.log("missing error", err.code, err.syscall, err.path === path.join(dir, "nope.txt")));
    rs.on("close", () => {
      console.log("missing close");
      resolve(0);
    });
  });
  check("start string", () => fs.createReadStream(file, { start: "1" }));
  check("start negative", () => fs.createReadStream(file, { start: -1 }));
  check("end fraction", () => fs.createReadStream(file, { end: 1.5 }));
  check("start > end", () => fs.createReadStream(file, { start: 5, end: 2 }));
  check("bad encoding", () => fs.createReadStream(file, { encoding: "nope" }));
  check("path number", () => fs.createReadStream(42));
  check("options number", () => fs.createReadStream(file, 5));
  check("hwm -1", () => fs.createReadStream(file, { highWaterMark: -1 }));
  check("hwm 1.5", () => fs.createReadStream(file, { highWaterMark: 1.5 }));
  check("encoding buffer", () => fs.createReadStream(file, { encoding: "buffer" }));
  check("encoding buffer, bad start", () => fs.createReadStream(file, { encoding: "buffer", start: -1 }));
  check("fd -1", () => fs.createReadStream(null, { fd: -1 }));
  check("path nul", () => fs.createReadStream("data\0.txt"));
  await new Promise((resolve) => {
    // destroy(err) before a failing open: Node's aggregateTwoErrors
    const rs = fs.createReadStream(path.join(dir, "missing.txt"));
    rs.on("error", (err) =>
      console.log("aggregate", err.name, err.code, err.message, err.errors.map((e) => e.code).join(",")),
    );
    rs.on("close", () => resolve(0));
    const stop = new Error("stop");
    stop.code = "ESTOP";
    rs.destroy(stop);
  });
  await new Promise((resolve) => {
    const rs = fs.createReadStream(file, { highWaterMark: 6 });
    let n = 0;
    rs.on("data", (c) => {
      n++;
      if (n === 2) rs.destroy();
    });
    rs.on("close", () => {
      console.log("destroyed after", n, "chunks", rs.destroyed);
      resolve(0);
    });
  });
  await new Promise((resolve) => {
    const rs = fs.createReadStream(file, { highWaterMark: 16 });
    rs.close(() => {
      console.log("close(cb)", rs.destroyed, rs.bytesRead);
      resolve(0);
    });
  });
  let text = "";
  for await (const chunk of fs.createReadStream(file, { highWaterMark: 7, encoding: "utf8" })) text += `[${chunk}]`;
  console.log("for await", text);
  fs.rmSync(dir, { recursive: true });
})();

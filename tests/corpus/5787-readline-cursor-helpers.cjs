'use strict';
// readline.cursorTo, moveCursor, clearLine and clearScreenDown: the
// sequences written to a stream and to process.stdout, the true result,
// null streams, completion callbacks, and Node's argument errors.
const readline = require("node:readline");
const { Writable } = require("node:stream");
const writes = [];
const out = new Writable({ write(c, e, cb) { writes.push(c.toString()); cb(); } });
console.log(readline.cursorTo(out, 3), readline.cursorTo(out, 3, 4), readline.moveCursor(out, -2, 5), readline.moveCursor(out, 0, 0), readline.clearLine(out, -1), readline.clearLine(out, 1), readline.clearLine(out, 0), readline.clearScreenDown(out));
console.log(JSON.stringify(writes));
console.log(readline.cursorTo(null, 1), readline.moveCursor(undefined, 1, 1), readline.clearLine(null, 0), readline.clearScreenDown(null));
readline.cursorTo(out, 1, () => console.log("cursorTo cb"));
readline.cursorTo(null, 1, 2, () => console.log("null cb"));
readline.moveCursor(out, 1, 0, () => console.log("move cb"));
readline.clearLine(out, 0, () => console.log("clear cb"));
for (const f of [() => readline.cursorTo(out, NaN), () => readline.cursorTo(out, 1, NaN), () => readline.cursorTo(out, undefined, 2), () => readline.cursorTo(null, NaN), () => readline.cursorTo(out, 1.5, 2.5), () => readline.moveCursor(out, 1.5, -0.5), () => readline.clearLine(out, 0.5), () => readline.cursorTo(out, -3)]) {
  try { console.log("ok", f()); } catch (e) { console.log(e.name, e.code, e.message); }
}
console.log(JSON.stringify(writes.slice(9)));
process.stdout.write("x");
readline.cursorTo(process.stdout, 0);
readline.clearLine(process.stdout, 0, () => console.log("stdout cb"));
console.log("end");

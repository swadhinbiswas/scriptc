// fs callbacks run on later loop turns: after the current synchronous code
// and its microtasks; one at a time with ticks and microtasks between
// them; and a chain of callbacks leaves room for timers and immediates.
const fs = require("fs");
const os = require("os");
const path = require("path");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "scr-cbturn-"));
const file = path.join(dir, "data.txt");
fs.writeFileSync(file, "abc");

const order = [];
fs.readFile(file, "utf8", (err, text) => {
  order.push(`readFile ${err} ${text}`);
  process.nextTick(() => order.push("tick after readFile"));
  Promise.resolve().then(() => order.push("microtask after readFile"));
});
Promise.resolve().then(() => order.push("microtask"));
order.push("sync");

let chained = 0;
let timerSawChain = -1;
let immediateSawChain = -1;
function next() {
  fs.stat(file, (err, st) => {
    if (err) throw err;
    chained++;
    if (chained < 2000) next();
    else finish();
  });
}
setTimeout(() => {
  timerSawChain = chained;
}, 1);
setImmediate(() => {
  immediateSawChain = chained;
});
next();

function finish() {
  fs.access(file, (err) => {
    order.push(`access ${err}`);
    console.log(order.join("\n"));
    console.log("chain", chained);
    console.log("timer ran during the chain", timerSawChain >= 0 && timerSawChain < chained);
    console.log("immediate ran during the chain", immediateSawChain >= 0 && immediateSawChain < chained);
    fs.rmSync(dir, { recursive: true });
  });
}

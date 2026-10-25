import * as readline from "node:readline";
import { PassThrough } from "node:stream";

// readline.promises is node:readline/promises, and both modules accept
// createInterface(input, output, completer, terminal): a positional
// completer runs on Tab in terminal mode, and terminal false keeps the
// interface line-based.
const input = new PassThrough();
const output = new PassThrough();
let written = "";
output.on("data", (chunk) => { written += chunk; });
const completer = (line) => [["apple", "apricot"].filter((c) => c.startsWith(line)), line];
const rl = readline.promises.createInterface(input, output, completer, true);
console.log("terminal", rl.terminal);
const answer = rl.question("fruit? ");
const tick = () => new Promise((resolve) => setImmediate(resolve));
for (const key of ["apr", "\t", "\r"]) {
  input.write(key);
  await tick();
}
console.log("answer", await answer);
rl.close();
console.log("written", JSON.stringify(written));

const plainInput = new PassThrough();
const plain = readline.createInterface(plainInput, null, undefined, false);
console.log("plain terminal", plain.terminal);
plain.on("line", (line) => console.log("line", line));
plainInput.end("one\ntwo\n");
plain.on("close", () => console.log("plain closed"));

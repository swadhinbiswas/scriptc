// createInterface's history and editing options on a non-terminal
// interface: history (the array itself), historySize,
// removeHistoryDuplicates, completer, tabSize and escapeCodeTimeout are
// validated in Node's order and kept, the members read back, and 'history'
// listeners never fire because only terminal interfaces record history.
import { createInterface } from "node:readline";
import * as rlp from "node:readline/promises";
import { PassThrough } from "node:stream";

const input = new PassThrough();
const history = ["second", "first"];
const rl = createInterface({ input, terminal: false, history, historySize: 5, removeHistoryDuplicates: true, tabSize: 4, escapeCodeTimeout: 20, crlfDelay: 250, completer: (line: string): [string[], string] => [["x"], line] });
console.log("members", rl.historySize, rl.historyIndex, rl.crlfDelay, rl.tabSize, rl.escapeCodeTimeout, rl.terminal, JSON.stringify(rl.line));
console.log("history", rl.history === history, rl.history.join(","));
rl.on("history", (h: string[]) => console.log("history event", h.length));
rl.on("line", (l: string) => console.log("line", l, rl.history.length));
rl.on("close", () => console.log("close", rl.history.join(",")));
input.end("a\nb\n");

const plain = createInterface({ input: new PassThrough() });
console.log("defaults", plain.historySize, plain.tabSize, plain.escapeCodeTimeout, plain.crlfDelay, plain.history.length, plain.history === plain.history);
plain.close();

for (const tab of [0, 1.5, 5000000000]) {
  try {
    createInterface({ input: new PassThrough(), tabSize: tab }).close();
  } catch (e) {
    console.log("tabSize", tab, (e as Error).name, (e as Error).message);
  }
}
for (const size of [-1, Number.NaN]) {
  try {
    createInterface({ input: new PassThrough(), historySize: size }).close();
  } catch (e) {
    console.log("historySize", (e as Error).message);
  }
}
try {
  createInterface({ input: new PassThrough(), escapeCodeTimeout: Infinity }).close();
} catch (e) {
  console.log("escapeCodeTimeout", (e as Error).name, (e as Error).message);
}

const promised = rlp.createInterface({ input: new PassThrough(), history: ["p"], historySize: 1, tabSize: 2 });
console.log("promises", promised.history.join(","), promised.historySize, promised.tabSize, promised.terminal);
promised.close();

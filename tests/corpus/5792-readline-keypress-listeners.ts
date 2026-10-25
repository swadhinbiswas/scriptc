import * as readline from "node:readline";
import { PassThrough } from "node:stream";

// 'keypress' listeners on a stream: once, a one-parameter listener,
// removeListener, listenerCount, and the escape timeout taken from the
// interface passed to emitKeypressEvents.
const input = new PassThrough();
const rl = readline.createInterface({ input: new PassThrough(), escapeCodeTimeout: 30 });
readline.emitKeypressEvents(input, rl);
const one = (str: string | undefined): void => console.log("one", JSON.stringify(str));
input.on("keypress", one);
input.once("keypress", () => console.log("once"));
input.on("keypress", (_str: string | undefined, key: readline.Key) => {
  console.log("key", key.name, key.ctrl, key.meta, key.shift, JSON.stringify(key.sequence));
});
console.log("count", input.listenerCount("keypress"));
input.write("a\x1b[B");
input.removeListener("keypress", one);
console.log("count", input.listenerCount("keypress"));
input.write("\x1b");
const started = Date.now();
setTimeout(() => {
  console.log("escape by now", Date.now() - started >= 30);
  input.write("\x1bb");
  rl.close();
}, 60);

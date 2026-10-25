import * as readline from "node:readline";
import { PassThrough } from "node:stream";

// readline.emitKeypressEvents over a stream: 'keypress' (str, key) for
// characters, control keys, escape sequences, and an escape resolved by
// the timeout; data before the first 'keypress' listener waits.
const input = new PassThrough();
readline.emitKeypressEvents(input, { escapeCodeTimeout: 20 });
readline.emitKeypressEvents(input);
console.log("listeners", input.listenerCount("data"), input.listenerCount("newListener"));
input.on("keypress", (str: string | undefined, key: readline.Key) => {
  console.log("keypress", JSON.stringify(str), JSON.stringify(key));
});
console.log("listeners", input.listenerCount("data"), input.listenerCount("newListener"));
input.write("a");
input.write("B\r");
input.write("\x03\x1b[A\x1b[1;5C\x1bOP\x1b[3~");
input.write("é\u{1F600}");
input.write("\x1bx");
input.write("\x1b");
setTimeout(() => {
  console.log("after timeout");
  input.write("q");
}, 60);

import * as readline from "node:readline";
import { PassThrough, Writable } from "node:stream";

// A terminal interface over streams: line editing, the kill ring, undo,
// history recall and the output Node writes for each key.
const input = new PassThrough();
const writes: string[] = [];
const output = new Writable({
  write(chunk: Buffer, _encoding: string, callback: () => void) {
    writes.push(chunk.toString());
    callback();
  },
});
const rl = readline.createInterface({
  input,
  output,
  terminal: true,
  prompt: "> ",
  historySize: 3,
  removeHistoryDuplicates: true,
});
console.log("terminal", rl.terminal, "cursor", rl.cursor);
rl.on("line", (line: string) => {
  console.log("line", JSON.stringify(line), "index", rl.historyIndex);
});
rl.on("history", (history: string[]) => {
  console.log("history", JSON.stringify(history));
});
function step(label: string, data: string): void {
  writes.length = 0;
  input.write(data);
  console.log(label, JSON.stringify(rl.line), rl.cursor, JSON.stringify(writes));
}
rl.prompt();
console.log("prompt", JSON.stringify(writes));
step("type", "hello world");
step("left", "\x1b[D\x1b[D");
step("insert", "X");
step("home", "\x1b[H");
step("end", "\x1b[F");
step("word-left", "\x1bb");
step("ctrl-w", "\x17");
step("ctrl-u", "\x15");
step("yank", "\x19");
step("undo", "\x1f");
step("redo", "\x1e");
step("backspace", "\x7f");
step("delete", "\x1b[3~");
step("ctrl-a", "\x01");
step("ctrl-k", "\x0b");
step("return", "first\r");
step("second", "second line\r");
step("third", "first\r");
step("fourth", "fourth\n");
step("up", "\x1b[A");
step("up2", "\x1b[A");
step("down", "\x1b[B");
step("search", "fi");
step("search-up", "\x1b[A");
step("enter", "\r");
step("paste", "a\r\nb\rc");
step("emoji", "\u{1F600}");
step("emoji-left", "\x1b[D");
step("ctrl-l", "\x0c");
console.log("history", JSON.stringify(rl.history));
rl.close();

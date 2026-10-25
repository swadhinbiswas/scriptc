import * as readline from "node:readline";
import { PassThrough, Writable } from "node:stream";

// Terminal details: yank-pop through the kill ring, word keys with
// modifiers, tabs at tabSize, a history entry with line breaks (shown as a
// multiline line), completion groups, and a dumb terminal.
const writes: string[] = [];
const output = new Writable({
  write(chunk: Buffer, _encoding: string, callback: () => void) {
    writes.push(chunk.toString());
    callback();
  },
});
const input = new PassThrough();
const rl = readline.createInterface({
  input,
  output,
  terminal: true,
  prompt: "",
  tabSize: 4,
  history: ["two\rone", "plain"],
  completer: (line: string): [string[], string] => [["ab", "ac", "", "b"], line],
});
rl.on("line", (line: string) => console.log("line", JSON.stringify(line)));
function step(label: string, data: string): void {
  writes.length = 0;
  input.write(data);
  console.log(label, JSON.stringify(rl.line), rl.cursor, JSON.stringify(writes));
}
step("words", "one two three");
step("ctrl-w", "\x17");
step("meta-backspace", "\x1b\x7f");
step("ctrl-w2", "\x17");
step("kill1", "alpha\x15");
step("kill2", "beta\x15");
step("yank", "\x19");
step("yank-pop", "\x1by");
step("yank-pop2", "\x1by");
step("kill-right", "\x01\x0b");
step("yank-again", "\x19");
step("ctrl-left", "\x1b[1;5D");
step("ctrl-right", "\x1b[1;5C");
step("meta-d", "\x01\x1bd");
step("ctrl-delete", "\x1b[3;5~");
step("tab-chars", "\x15a\tb");
step("cr", "\r");
step("up", "\x1b[A");
step("up2", "\x1b[A");
step("multiline-up", "\x1b[A");
step("multiline-down", "\x1b[B");
step("multiline-enter", "\r");
step("complete", "\t");
step("complete2", "\t");
step("f-keys", "\x1bOP\x1b[15~\x1b[[A\x1b[Z");
step("unknown", "\x1b[99x");
console.log("history", JSON.stringify(rl.history));
rl.close();

process.env.TERM = "dumb";
const writes2: string[] = [];
const output2 = new Writable({
  write(chunk: Buffer, _encoding: string, callback: () => void) {
    writes2.push(chunk.toString());
    callback();
  },
});
const input2 = new PassThrough();
const dumb = readline.createInterface({ input: input2, output: output2, terminal: true });
dumb.on("line", (line: string) => console.log("dumb line", JSON.stringify(line)));
dumb.on("close", () => console.log("dumb close"));
dumb.prompt();
input2.write("ab\x1b[Dc\r");
console.log("dumb", JSON.stringify(writes2), JSON.stringify(dumb.history));
input2.write("\x04");

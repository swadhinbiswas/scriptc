// Terminal interfaces: Tab completion (a one-argument completer and a
// callback completer), write(data, key), Ctrl+C and Ctrl+D, the escape
// timeout, prompt(true) and 'pause'/'resume' around the completer.
const readline = require("node:readline");
const { PassThrough, Writable } = require("node:stream");

const writes = [];
const output = new Writable({
  write(chunk, _encoding, callback) {
    writes.push(chunk.toString());
    callback();
  },
});
const writes2 = [];
const output2 = new Writable({
  write(chunk, _encoding, callback) {
    writes2.push(chunk.toString());
    callback();
  },
});

const words = ["help", "hello", "history", "quit"];
const input = new PassThrough();
const rl = readline.createInterface({
  input,
  output,
  terminal: true,
  prompt: "$ ",
  completer: (line) => [words.filter((w) => w.startsWith(line)), line],
});
rl.on("line", (line) => console.log("line", JSON.stringify(line)));
rl.on("pause", () => console.log("pause"));
rl.on("resume", () => console.log("resume"));
function step(label, data) {
  writes.length = 0;
  input.write(data);
  console.log(label, JSON.stringify(rl.line), rl.cursor, JSON.stringify(writes));
}
rl.prompt();
step("h-tab", "h\t");
step("tab", "\t");
step("tab-tab", "\t");
step("l", "l");
step("tab-l", "\t");
step("q", "\x15q\t");
step("enter", "\r");
step("none", "zz\t\t");
writes.length = 0;
rl.write(null, { ctrl: true, name: "u" });
console.log("key ctrl-u", JSON.stringify(rl.line), JSON.stringify(writes));
rl.write("abc");
rl.write(null, { ctrl: true, name: "b" });
rl.write(null, { name: "left" });
console.log("key left", JSON.stringify(rl.line), rl.cursor);
rl.write(null, { meta: true, name: "f" });
console.log("key meta-f", rl.cursor);
writes.length = 0;
rl.prompt(true);
console.log("prompt-true", JSON.stringify(writes));
rl.write("\x1b[D");
console.log("write-escape", JSON.stringify(rl.line), rl.cursor);

let sigints = 0;
rl.on("SIGINT", () => {
  sigints++;
  console.log("SIGINT", sigints);
});
step("ctrl-c", "\x03");
step("esc-tail", "x\x1b");
setTimeout(() => {
  console.log("after-timeout", JSON.stringify(rl.line), rl.cursor);
  step("ctrl-d-nonempty", "\x04");
  step("ctrl-a-ctrl-d", "\x01\x04");
  const input2 = new PassThrough();
  const rl2 = readline.createInterface({
    input: input2,
    output: output2,
    terminal: true,
    completer: (line, callback) => {
      console.log("callback completer", JSON.stringify(line));
      setTimeout(() => callback(null, [["alpha", "alpine"], line]), 5);
    },
  });
  rl2.on("line", (line) => console.log("rl2 line", JSON.stringify(line)));
  rl2.on("pause", () => console.log("rl2 pause"));
  rl2.on("resume", () => console.log("rl2 resume"));
  rl2.on("close", () => console.log("rl2 close"));
  input2.write("al\t");
  console.log("rl2 pending", JSON.stringify(rl2.line));
  setTimeout(() => {
    console.log("rl2 completed", JSON.stringify(rl2.line), rl2.cursor, JSON.stringify(writes2));
    input2.write("\x03");
    console.log("rl2 closed", rl2.terminal);
    rl.on("close", () => console.log("rl close"));
    input.write("\x01\x0b\x04");
  }, 30);
}, 700);

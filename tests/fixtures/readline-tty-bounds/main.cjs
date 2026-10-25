// Terminal editing over a recalled two-line history entry whose first line
// is a supplementary character: Up from the end of "x" lands inside the
// surrogate pair in Node's kMultilineMove; the cursor stays on the pair's
// start here, and the keys after it edit within the line.
const readline = require("readline");
const { PassThrough } = require("stream");

function run(name, keys) {
  const input = new PassThrough();
  const output = new PassThrough();
  const rl = readline.createInterface({ input, output, terminal: true, history: ["x\r\u{1F600}"] });
  rl.on("line", (line) => console.log(name, "line", JSON.stringify(line)));
  input.write("\x1b[A"); // recall "😀\nx", cursor at its end
  for (const key of keys) {
    input.write(key);
    console.log(name, JSON.stringify(key), JSON.stringify(rl.line), rl.cursor);
  }
  input.write("\r");
  rl.close();
}

run("backspace", ["\x1b[A", "\x7f", "\x7f"]);
run("ctrl-w", ["\x1b[A", "\x17"]);
run("ctrl-u", ["\x1b[A", "\x15"]);
run("ctrl-k", ["\x1b[A", "\x0b"]);
run("delete", ["\x1b[A", "\x1b[3~"]);
run("right", ["\x1b[A", "\x1b[C", "\x7f"]);
run("left", ["\x1b[A", "\x1b[D", "\x7f"]);
run("down", ["\x1b[A", "\x1b[B", "\x7f"]);
run("undo", ["\x1b[A", "\x1b[C", "\x7f", "\x1f", "\x7f"]);

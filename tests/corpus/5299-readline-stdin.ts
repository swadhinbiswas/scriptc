// node:readline/promises over process.stdin: the program re-runs itself
// with piped input and prints the child's output. The first line answers
// the question (its prompt goes to stdout), the 'line' listener receives
// the rest, the trailing line without a newline included, and 'close'
// follows the end of input. A second child reads every line with for
// await, and a callback interface reports \r\n-terminated lines.
import { execFileSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import * as readlineCb from "node:readline";

const mode = process.argv[2];
if (mode === "question") {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = rl.question("name? ");
  const rest: string[] = [];
  rl.on("line", (line: string) => rest.push(line));
  rl.on("close", () => console.log("closed after", rest.join(",")));
  console.log(`\nhello ${await answer}`);
} else if (mode === "lines") {
  const rl = createInterface({ input: process.stdin });
  let n = 0;
  for await (const line of rl) console.log(++n, line);
  console.log("done");
} else if (mode === "callback") {
  const rl = readlineCb.createInterface({ input: process.stdin });
  rl.on("line", (line: string) => console.log("line:", line));
  rl.on("close", () => console.log("closed"));
} else {
  for (const [child, input] of [
    ["question", "Ada\nblue\nx\nz"],
    ["lines", "a\n\nb\r\nc"],
    ["callback", "first\r\nsecond\nthird"],
  ]) {
    const stdout = execFileSync(process.execPath, [process.argv[1]!, child!], { input, encoding: "utf8" });
    console.log(child, JSON.stringify(stdout));
  }
}

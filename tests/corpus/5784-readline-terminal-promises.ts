import * as readline from "node:readline/promises";
import { PassThrough, Writable } from "node:stream";

// readline/promises over a terminal: an async completer is awaited, a
// throwing one prints the error, and Ctrl+C rejects the pending question
// with an AbortError.
const input = new PassThrough();
const writes: string[] = [];
const output = new Writable({
  write(chunk: Buffer, _encoding: string, callback: () => void) {
    writes.push(chunk.toString());
    callback();
  },
});
let failNext = false;
const rl = readline.createInterface({
  input,
  output,
  terminal: true,
  completer: async (line: string): Promise<[string[], string]> => {
    if (failNext) throw "no completions";
    return [["red", "green", "grey"].filter((c) => c.startsWith(line)), line];
  },
});
rl.on("pause", () => console.log("pause"));
rl.on("resume", () => console.log("resume"));
rl.on("close", () => console.log("close"));

async function main(): Promise<void> {
  const answer = rl.question("color? ");
  console.log("asked", JSON.stringify(writes));
  writes.length = 0;
  input.write("gr\t");
  console.log("after tab", JSON.stringify(rl.line));
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
  console.log("completed", JSON.stringify(rl.line), JSON.stringify(writes));
  writes.length = 0;
  input.write("e\t");
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
  console.log("completed2", JSON.stringify(rl.line), JSON.stringify(writes));
  input.write("\r");
  console.log("answer", JSON.stringify(await answer));
  failNext = true;
  writes.length = 0;
  input.write("x\t");
  await new Promise<void>((resolve) => setTimeout(resolve, 10));
  console.log("failed", JSON.stringify(writes));
  const pending = rl.question("again? ");
  input.write("\x03");
  try {
    await pending;
  } catch (err) {
    const e = err as Error & { code?: string };
    console.log("rejected", e.name, e.message, e.code);
  }
  console.log("history", JSON.stringify(rl.history));
}
main();

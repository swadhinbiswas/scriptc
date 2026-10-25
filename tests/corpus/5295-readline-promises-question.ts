// node:readline/promises question() over a stream input and output: the
// prompt is written to the output, the next line answers, a second
// question while one is pending writes the first prompt again and never
// settles, close() leaves a pending question unsettled, and a question on
// a closed interface rejects with ERR_USE_AFTER_CLOSE. Without an output
// nothing is written. setPrompt/getPrompt/prompt manage the prompt, and
// write() feeds text as if it were input.
import * as readline from "node:readline/promises";
import { PassThrough, Readable } from "node:stream";

const out = new PassThrough();
out.on("data", (c: Buffer) => console.log("output:", JSON.stringify(c.toString())));

const rl = readline.createInterface({ input: Readable.from(["alpha\nbeta\n"]), output: out });
const first = rl.question("first? ");
const second = rl.question("second? ");
first.then((answer: string) => console.log("first answer:", answer));
second.then((answer: string) => console.log("second answer (never):", answer));
rl.on("line", (line: string) => console.log("line:", line));
rl.on("pause", () => console.log("pause"));
rl.on("close", () => console.log("close"));
await new Promise<void>((resolve) => setTimeout(resolve, 10));

const quiet = readline.createInterface({ input: new Readable({ read() {} }) });
quiet.question("not written ").then((answer: string) => console.log("never:", answer));
quiet.close();
try {
  await quiet.question("again ");
} catch (e) {
  console.log("after close:", (e as Error & { code?: string }).code, (e as Error).message);
}

const prompter = readline.createInterface({
  input: new Readable({ read() {} }),
  output: out,
  prompt: "$ ",
});
console.log("prompt:", JSON.stringify(prompter.getPrompt()));
prompter.prompt();
prompter.setPrompt("> ");
prompter.prompt(true);
prompter.on("line", (line: string) => console.log("typed:", line));
prompter.write("one\ntwo");
prompter.write("\n");
const typed = prompter.question("q? ");
prompter.write("answer\n");
console.log("answered:", await typed);
console.log("prompt restored:", JSON.stringify(prompter.getPrompt()));
prompter.close();

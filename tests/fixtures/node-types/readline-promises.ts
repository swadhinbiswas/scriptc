// readline/promises under @types/node: the Interface over process.stdin,
// a question answered through write() with the prompt on stdout, 'line'
// for text with no pending question, close(), and the rejection of a
// question asked after close.
import { createInterface } from "node:readline/promises";

const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.on("line", (line: string) => console.log("line:", line));
rl.on("close", () => console.log("closed"));
const answer = rl.question("name? ");
rl.write("Ada\nextra\n");
console.log("\nname:", await answer);
rl.close();
try {
  await rl.question("again? ");
} catch (err) {
  console.log("after close:", (err as Error & { code?: string }).code);
}

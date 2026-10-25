// Line splitting and async iteration on node:readline/promises: \n, \r\n
// and a lone \r end lines, a \n that arrives in the next chunk after a
// \r is dropped (within crlfDelay), UTF-8 sequences split across chunks
// decode whole, and the unfinished last line is emitted at the end of
// input. for await reads the same lines; after a break the lines already
// queued are still read by the next loop. More than 1024 queued lines
// pause the input until the loop catches up.
import { createInterface } from "node:readline/promises";
import { Readable } from "node:stream";

const src = new Readable({ read() {} });
const rl = createInterface({ input: src, crlfDelay: Infinity });
rl.on("line", (line: string) => console.log("line", JSON.stringify(line)));
rl.on("close", () => console.log("closed"));
for (const chunk of ["one\r", "\ntwo\r\nthree\rfour", "\n", "cafÃ", "©\nlast"]) {
  src.push(Buffer.from(chunk, "latin1"));
}
src.push(null);
await new Promise<void>((resolve) => setTimeout(resolve, 10));

const lines = createInterface({ input: Readable.from(["1\n2\n3\n4"]) });
for await (const line of lines) {
  console.log("first loop", line);
  break;
}
for await (const line of lines) console.log("second loop", line);
console.log("loops done");

const many: string[] = [];
for (let i = 0; i < 1500; i++) many.push(`row ${i}`);
const big = createInterface({ input: Readable.from([many.join("\n") + "\n"]) });
let pauses = 0;
let resumes = 0;
big.on("pause", () => pauses++);
big.on("resume", () => resumes++);
let count = 0;
let lastLine = "";
for await (const line of big) {
  count++;
  lastLine = line;
  if (count === 1) await new Promise<void>((resolve) => setTimeout(resolve, 5));
}
console.log("read", count, lastLine, "pauses", pauses, "resumes", resumes);

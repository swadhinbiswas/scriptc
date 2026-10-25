import { Readable } from "node:stream";
const log: string[] = [];
let i = 0;
const hop = (): void => { if (i++ < 12) { log.push(`hop ${i}`); Promise.resolve().then(hop); } };
async function run(): Promise<void> {
  for await (const c of Readable.from(["a", "b"])) log.push(`got ${String(c)}`);
  log.push("loop done");
}
Promise.resolve().then(hop);
const p = run();
await p;
await new Promise<void>((r) => setTimeout(r, 5));
console.log(log.join(" | "));

// pushes made inside the iterator's own _read arrive as one chunk
const r = new Readable({ read() { this.push(Buffer.from("ab")); this.push(Buffer.from("cd")); this.push(null); } });
for await (const c of r) console.log("chunk", c);

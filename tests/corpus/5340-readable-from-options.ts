import { Readable } from "node:stream";

const a = Readable.from(["x", "y"]);
console.log("array", a.readableLength, a.readableHighWaterMark, a.readableObjectMode);
const s = Readable.from("hello");
console.log("string", s.readableLength, s.readableHighWaterMark, s.readableObjectMode);
const b = Readable.from(Buffer.from("hi"));
console.log("buffer", b.readableHighWaterMark, b.readableObjectMode);
const bytes = Readable.from(["ab", "cd"], { objectMode: false });
console.log("objectMode false", bytes.readableObjectMode, bytes.readableHighWaterMark);
bytes.on("data", (c: Buffer) => console.log("bytes data", c));
const hw = Readable.from(["1", "2", "3"], { highWaterMark: 2 });
console.log("hwm 2", hw.readableHighWaterMark);
hw.on("data", (c: string) => console.log("hw data", c, hw.readableLength));
hw.on("close", () => console.log("hw close"));
for (const h of [-1, 1.5, NaN, Infinity]) {
  try {
    Readable.from(["a"], { highWaterMark: h });
  } catch (err) {
    console.log((err as NodeJS.ErrnoException).code, (err as Error).message);
  }
}
const lazy = Readable.from([Buffer.from("p"), Buffer.from("q")]);
lazy.on("readable", () => {
  let c: Buffer | null;
  while ((c = lazy.read()) !== null) console.log("read", String(c), lazy.readableLength);
});
lazy.on("end", () => console.log("lazy end"));
lazy.on("close", () => console.log("lazy close"));
const sb = Readable.from(Buffer.from("xyz"), { objectMode: false });
sb.on("data", (c: Buffer) => console.log("single bytes", c, sb.readableHighWaterMark));
const d = Readable.from(["d1", "d2"]);
d.on("close", () => console.log("destroyed close"));
d.destroy();
process.nextTick(() => console.log("tick 1"));
queueMicrotask(() => console.log("micro 1"));
const ord = Readable.from(["o1", "o2", "o3"]);
ord.on("data", (c: string) => {
  console.log("ord", c);
  process.nextTick(() => console.log("ord tick", c));
});
ord.on("end", () => console.log("ord end"));
ord.on("close", () => console.log("ord close"));
// an `any` source takes the checked-dynamic form, options included
const anySrc: any = JSON.parse('["a","b"]');
const fromAny = Readable.from(anySrc, { objectMode: false });
console.log("any source", fromAny.readableObjectMode, fromAny.readableHighWaterMark);
fromAny.on("data", (c: Buffer) => console.log("any data", c));

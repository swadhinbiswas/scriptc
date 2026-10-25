// Readable.from over a Set and over Map, Set and array iterators: from.js
// takes the iterator when the stream is built and reads it live, one value
// per push, so entries added or removed before a read are seen.
import { Readable } from "node:stream";

async function interleaved(label: string, r: Readable): Promise<void> {
  const log: string[] = [];
  let n = 0;
  const chain = (): void => {
    if (n < 10) {
      n++;
      log.push(`m${n}`);
      queueMicrotask(chain);
    }
  };
  for await (const c of r) {
    log.push(String(c));
    if (n === 0) {
      queueMicrotask(chain);
      process.nextTick(() => log.push("tick"));
    }
  }
  console.log(label, log.join(" "));
}

async function main(): Promise<void> {
  const s = new Set<string>(["a"]);
  const live = Readable.from(s);
  s.add("b");
  s.add("c");
  s.delete("a");
  await interleaved("set", live);

  const m = new Map<string, string>([["k1", "v1"]]);
  const values = Readable.from(m.values());
  m.set("k2", "v2");
  await interleaved("map values", values);
  await interleaved("map keys", Readable.from(m.keys()));
  await interleaved("set values", Readable.from(new Set<string>(["s1", "s2"]).values()));
  const arr = ["a1", "a2", "a3"];
  await interleaved("array values", Readable.from(arr.values()));

  const bytes: string[] = [];
  const byteMode = Readable.from(new Set<string>(["x", "y", "z"]), { objectMode: false });
  for await (const c of byteMode) bytes.push(Buffer.isBuffer(c) ? `<Buffer ${String(c)}>` : String(c));
  console.log("byte mode", bytes.join(" "), byteMode.readableObjectMode);

  const hwm = Readable.from(new Set<string>(["h1", "h2", "h3"]), { highWaterMark: 2 });
  console.log("highWaterMark", hwm.readableHighWaterMark, hwm.readableObjectMode);
  const got: string[] = [];
  for await (const c of hwm) got.push(String(c));
  console.log("hwm chunks", got.join(","));

  const empty = Readable.from(new Set<string>());
  empty.on("end", () => console.log("empty end"));
  empty.on("close", () => console.log("empty close"));
  empty.resume();
}
void main();

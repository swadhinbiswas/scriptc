// zlib streams with stream/promises and async iteration: a promise
// pipeline from Readable.from() through Gzip and Gunzip into a Writable,
// a rejected pipeline when the decoder sees corrupt input, and a
// for-await loop over a decoder fed in pieces.
import { createGunzip, createGzip, createInflate, deflateSync, gzipSync } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable, Writable } from "node:stream";

const words = ["alpha ", "beta ", "gamma ", "delta "];

async function main(): Promise<void> {
  const parts: Buffer[] = [];
  const sink = new Writable({
    write(chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void) {
      parts.push(chunk);
      callback();
    },
  });
  await pipeline(Readable.from(words.map((w) => w.repeat(200))), createGzip(), createGunzip(), sink);
  const text = Buffer.concat(parts).toString();
  console.log("pipeline", text.length, text.startsWith("alpha alpha"), text.endsWith("delta "));

  try {
    await pipeline(
      Readable.from([Buffer.from("this is not gzip")]),
      createGunzip(),
      new Writable({
        write(_chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void) {
          callback();
        },
      }),
    );
    console.log("unexpected success");
  } catch (error) {
    const e = error as Error & { code?: string };
    console.log("rejected", e.code, e.message);
  }

  const packed = gzipSync(words.join("").repeat(500));
  const decoder = createGunzip({ chunkSize: 4096 });
  let offset = 0;
  const feed = (): void => {
    if (offset >= packed.length) {
      decoder.end();
      return;
    }
    decoder.write(packed.subarray(offset, offset + 1000), feed);
    offset += 1000;
  };
  feed();
  let total = 0;
  let largest = 0;
  for await (const chunk of decoder) {
    total += (chunk as Buffer).length;
    largest = Math.max(largest, (chunk as Buffer).length);
  }
  console.log("for await", total, largest <= 4096);

  const inflate = createInflate();
  inflate.end(deflateSync("tail"));
  const chunks: string[] = [];
  for await (const chunk of inflate) chunks.push((chunk as Buffer).toString());
  console.log("inflate", chunks.join(""));
}

main();

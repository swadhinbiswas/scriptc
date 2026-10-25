// The zlib stream classes round-trip through pipeline(): Deflate/Inflate,
// DeflateRaw/InflateRaw, Gzip/Gunzip, and Unzip over both gzip and zlib
// input, with the factory and constructor spellings. Compressed bytes are
// zlib-version-dependent, so only decompressed results, input byte counts,
// and the format markers are printed.
import * as zlib from "node:zlib";
import { pipeline, Readable, Writable } from "node:stream";

const lines: string[] = [];
for (let i = 0; i < 1500; i++) lines.push(`line ${i} ${"abc".repeat(i % 7)}`);
const input = Buffer.from(lines.join("\n"));

function source(): Readable {
  let offset = 0;
  return new Readable({
    read() {
      if (offset >= input.length) {
        this.push(null);
        return;
      }
      this.push(input.subarray(offset, offset + 4000));
      offset += 4000;
    },
  });
}

function sink(parts: Buffer[]): Writable {
  return new Writable({
    write(chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void) {
      parts.push(chunk);
      callback();
    },
  });
}

function roundTrip(label: string, encoder: zlib.Gzip, decoder: zlib.Gunzip): Promise<void> {
  return new Promise((resolve) => {
    const parts: Buffer[] = [];
    pipeline(source(), encoder, decoder, sink(parts), (error: Error | null | undefined) => {
      const out = Buffer.concat(parts);
      console.log(label, error === undefined || error === null, out.equals(input), out.length);
      console.log("  bytesWritten", encoder.bytesWritten === input.length, decoder.bytesWritten > 0);
      resolve();
    });
  });
}

function header(label: string, encoder: zlib.Gzip): Promise<void> {
  return new Promise((resolve) => {
    const parts: Buffer[] = [];
    encoder.on("data", (chunk: Buffer) => parts.push(chunk));
    encoder.on("end", () => {
      console.log(label, Buffer.concat(parts).subarray(0, 2).toString("hex"));
      resolve();
    });
    encoder.end("header check");
  });
}

// Decoded chunks are Buffers: string conversion gives their text.
function text(): Promise<void> {
  return new Promise((resolve) => {
    const decoder = zlib.createGunzip();
    decoder.on("data", (chunk: Buffer) => {
      console.log("chunk text", `${chunk}`, String(chunk) + "!", chunk + "", chunk.toString("hex"));
    });
    decoder.on("end", () => resolve());
    decoder.end(zlib.gzipSync("plain text"));
  });
}

async function main(): Promise<void> {
  await roundTrip("deflate", zlib.createDeflate(), zlib.createInflate());
  await roundTrip("raw", zlib.createDeflateRaw(), zlib.createInflateRaw());
  await roundTrip("gzip", zlib.createGzip(), zlib.createGunzip());
  await roundTrip("unzip gzip", new zlib.Gzip(), new zlib.Unzip());
  await roundTrip("unzip deflate", new zlib.Deflate(), zlib.createUnzip());
  await roundTrip("level 1", zlib.createGzip({ level: 1 }), zlib.createGunzip({ chunkSize: 1024 }));
  await header("gzip header", zlib.createGzip());
  await header("zlib header", zlib.createDeflate());
  await text();
}

main();

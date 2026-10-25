// The callback forms with options: options are validated synchronously
// (the throw happens at the call), the result arrives on a later turn,
// errors carry Node's errno and code, maxOutputLength and
// rejectGarbageAfterEnd report through the callback, results are Buffers,
// and the default forms read every gzip member.
import * as zlib from "node:zlib";

const text = "callback options round trip ".repeat(40);

function run(label: string, start: (done: (error: Error | null, result: Buffer) => void) => void): Promise<void> {
  return new Promise((resolve) => {
    let returned = false;
    try {
      start((error, result) => {
        const e = error as (Error & { code?: string; errno?: number }) | null;
        console.log(
          label,
          returned,
          e === null ? "ok" : `${e.name} ${e.code} ${e.errno} ${e.message}`,
          e === null ? result.length : "-",
        );
        resolve();
      });
      returned = true;
    } catch (error) {
      const e = error as Error & { code?: string };
      console.log(label, "threw", e.code, e.message);
      resolve();
    }
  });
}

async function main(): Promise<void> {
  const packed = zlib.deflateSync(text);
  await run("inflate options", (done) => zlib.inflate(packed, { chunkSize: 128 }, done));
  await run("buffer text", (done) =>
    zlib.gunzip(zlib.gzipSync("decoded"), { chunkSize: 64 }, (error, value) => {
      console.log("text", `${value}`, String(value) + "!", value + "");
      done(error, value);
    }),
  );
  await run("deflate level", (done) => zlib.deflate(text, { level: 1, memLevel: 2 }, (error, value) => {
    done(error, error === null ? zlib.inflateSync(value) : value);
  }));
  await run("raw windowBits", (done) =>
    zlib.deflateRaw(text, { windowBits: 10 }, (error, value) => {
      done(error, error === null ? zlib.inflateRawSync(value, { windowBits: 10 }) : value);
    }),
  );
  await run("gzip members", (done) =>
    zlib.gunzip(Buffer.concat([zlib.gzipSync("a"), zlib.gzipSync("bc")]), done),
  );
  await run("gzip members options", (done) =>
    zlib.gunzip(Buffer.concat([zlib.gzipSync("a"), zlib.gzipSync("bc")]), { chunkSize: 64 }, done),
  );
  await run("max output", (done) => zlib.unzip(packed, { maxOutputLength: 64 }, done));
  await run("reject junk", (done) =>
    zlib.inflate(Buffer.concat([packed, Buffer.from("junk")]), { rejectGarbageAfterEnd: true }, done),
  );
  await run("corrupt", (done) => zlib.inflate(Buffer.from("garbage"), done));
  await run("corrupt options", (done) => zlib.gunzip(Buffer.from("garbage"), { level: 1 }, done));
  await run("bad option", (done) => zlib.deflate(text, { strategy: 9 }, done));
  await run("bad level type", (done) => zlib.deflate(text, { level: "high" }, done));
}

main();

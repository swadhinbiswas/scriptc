// zlib stream options: Node's validation order and messages for the zlib
// options (windowBits, level, memLevel, strategy, dictionary), the stream
// base's (chunkSize, flush, finishFlush, maxOutputLength,
// rejectGarbageAfterEnd) and the Transform high-water marks, plus the
// options that change behavior: encoding and objectMode are ignored,
// highWaterMark sets both sides, DeflateRaw takes windowBits 8 as 9, and
// inflate accepts windowBits 0.
const zlib = require("node:zlib");

function attempt(label, make) {
  try {
    const stream = make();
    console.log(label, "ok", stream.readableHighWaterMark, stream.writableHighWaterMark);
  } catch (error) {
    console.log(label, error.name, error.code, JSON.stringify(error.message));
  }
}
attempt("chunkSize 10", () => zlib.createGzip({ chunkSize: 10 }));
attempt("chunkSize NaN", () => zlib.createGzip({ chunkSize: NaN }));
attempt("chunkSize string", () => zlib.createGzip({ chunkSize: "big" }));
attempt("level 10", () => zlib.createDeflate({ level: 10 }));
attempt("level string", () => zlib.createDeflate({ level: "x" }));
attempt("level Infinity", () => zlib.createDeflate({ level: Infinity }));
attempt("windowBits 8 gzip", () => zlib.createGzip({ windowBits: 8 }));
attempt("windowBits 16", () => zlib.createInflate({ windowBits: 16 }));
attempt("memLevel 0", () => zlib.createDeflate({ memLevel: 0 }));
attempt("strategy 5", () => zlib.createDeflate({ strategy: 5 }));
attempt("dictionary string", () => zlib.createDeflate({ dictionary: "abc" }));
attempt("flush 6", () => zlib.createGzip({ flush: 6 }));
attempt("finishFlush -1", () => zlib.createGzip({ finishFlush: -1 }));
attempt("maxOutputLength 0", () => zlib.createGunzip({ maxOutputLength: 0 }));
attempt("rejectGarbageAfterEnd 1", () => zlib.createGunzip({ rejectGarbageAfterEnd: 1 }));
attempt("highWaterMark -1", () => zlib.createGzip({ highWaterMark: -1 }));
attempt("writableHighWaterMark 1.5", () => zlib.createGzip({ writableHighWaterMark: 1.5 }));
attempt("level and chunkSize", () => zlib.createGzip({ level: 99, chunkSize: 1 }));
attempt("chunkSize and flush", () => zlib.createGzip({ chunkSize: 1, flush: 99 }));
attempt("null options", () => zlib.createGzip(null));
attempt("windowBits 8 raw", () => zlib.createDeflateRaw({ windowBits: 8 }));
attempt("windowBits 0 inflate", () => zlib.createInflate({ windowBits: 0 }));

const marks = zlib.createGzip({ highWaterMark: 100 });
console.log("marks", marks.readableHighWaterMark, marks.writableHighWaterMark);
const sided = zlib.createGzip({ readableHighWaterMark: 10, writableHighWaterMark: 20 });
console.log("sided", sided.readableHighWaterMark, sided.writableHighWaterMark);

const input = "options keep the data intact ".repeat(30);
const packed = zlib.deflateRawSync(input);
const decoded = [];
const raw = zlib.createInflateRaw({ windowBits: 8, encoding: "utf8", objectMode: true });
raw.on("data", (chunk) => decoded.push(Buffer.isBuffer(chunk)));
raw.on("end", () => {
  console.log("encoding ignored", decoded.every(Boolean));
  let text = "";
  const pair = zlib.createDeflate({ level: 9, memLevel: 9, strategy: zlib.constants.Z_FILTERED, windowBits: 9 });
  const back = zlib.createInflate({ windowBits: 0 });
  pair.pipe(back);
  back.on("data", (chunk) => (text += chunk.toString()));
  back.on("end", () => console.log("tuned", text === input));
  pair.end(input);
});
raw.end(packed);

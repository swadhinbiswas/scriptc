// The one-shot sync forms with options run Node's engine: round trips
// with windowBits, memLevel, strategy, level and a dictionary,
// finishFlush on a partial stream, maxOutputLength's ERR_BUFFER_TOO_LARGE,
// rejectGarbageAfterEnd, gunzip of several members, and Node's errors
// (message, errno and code) for corrupt, truncated and empty input and
// for invalid options; results are Buffers. Compressed bytes depend on the
// zlib build, so only decoded results and stored (level 0) or fixed blobs
// are printed.
const zlib = require("node:zlib");

const text = "one-shot options keep the data intact ".repeat(50);

function attempt(label, run) {
  try {
    const out = run();
    console.log(label, "ok", typeof out === "string" ? JSON.stringify(out.slice(0, 40)) : out);
  } catch (error) {
    console.log(label, error.name, error.code, error.errno, JSON.stringify(error.message));
  }
}

attempt("windowBits", () => zlib.inflateRawSync(zlib.deflateRawSync(text, { windowBits: 9 }), { windowBits: 9 }).toString() === text);
attempt("tuned", () => zlib.gunzipSync(zlib.gzipSync(text, { level: 1, memLevel: 9, strategy: zlib.constants.Z_HUFFMAN_ONLY })).toString() === text);
attempt("dictionary", () => zlib.inflateSync(zlib.deflateSync(text, { dictionary: Buffer.from("options data") }), { dictionary: Buffer.from("options data") }).toString() === text);
attempt("missing dictionary", () => zlib.inflateSync(zlib.deflateSync(text, { dictionary: Buffer.from("options data") })));
attempt("chunkSize", () => zlib.unzipSync(zlib.deflateSync(text, { chunkSize: 64 }), { chunkSize: 64 }).toString() === text);
attempt("stored prefix", () => zlib.inflateSync(zlib.deflateSync(text, { level: 0 }).subarray(0, 60), { finishFlush: zlib.constants.Z_SYNC_FLUSH }).toString());
attempt("stored truncated", () => zlib.inflateSync(zlib.deflateSync(text, { level: 0 }).subarray(0, 60)));
attempt("max output", () => zlib.inflateSync(zlib.deflateSync(text), { maxOutputLength: 100 }));
attempt("max output fits", () => zlib.inflateSync(zlib.deflateSync(text), { maxOutputLength: text.length }).length);
attempt("max output fraction", () => zlib.gunzipSync(zlib.gzipSync(text), { maxOutputLength: 10.5 }));
attempt("members", () => zlib.gunzipSync(Buffer.concat([zlib.gzipSync("first "), zlib.gzipSync("second")])).toString());
attempt("members reject", () => zlib.gunzipSync(Buffer.concat([zlib.gzipSync("first "), zlib.gzipSync("second")]), { rejectGarbageAfterEnd: true }));
attempt("trailing", () => zlib.inflateSync(Buffer.concat([zlib.deflateSync("kept"), Buffer.from("junk")])).toString());
attempt("trailing reject", () => zlib.inflateSync(Buffer.concat([zlib.deflateSync("kept"), Buffer.from("junk")]), { rejectGarbageAfterEnd: true }));
attempt("corrupt", () => zlib.inflateSync(Buffer.from("not zlib at all")));
attempt("corrupt gunzip", () => zlib.gunzipSync(Buffer.from("not gzip at all")));
attempt("empty", () => zlib.inflateSync(Buffer.alloc(0)));
attempt("bad level", () => zlib.deflateSync(text, { level: 12 }));
attempt("bad windowBits", () => zlib.gzipSync(text, { windowBits: 8 }));
attempt("bad dictionary", () => zlib.deflateSync(text, { dictionary: "nope" }));
attempt("bad chunkSize", () => zlib.deflateSync(text, { chunkSize: 1 }));
attempt("bad maxOutputLength", () => zlib.inflateSync(zlib.deflateSync(text), { maxOutputLength: 0 }));
attempt("null options", () => zlib.inflateSync(zlib.deflateSync(text), null).length);
attempt("buffer text", () => {
  const out = zlib.inflateSync(zlib.deflateSync("decoded text"), { chunkSize: 64 });
  return `${out}|${String(out)}|${out + ""}`;
});
const runtime = { level: 9 };
attempt("runtime level", () => zlib.inflateSync(zlib.deflateSync(text, runtime)).toString() === text);

// zlib one-shot forms on untyped values: strings encode as UTF-8, every
// TypedArray, DataView and ArrayBuffer contributes its bytes, other values
// throw Node's ERR_INVALID_ARG_TYPE ("buffer" for the sync forms, "chunk"
// for the callback forms), options are validated before the input, and
// results are Buffers.
const zlib = require("node:zlib");

function packSync(data, options) {
  return zlib.deflateSync(data, options);
}

function unpackSync(data) {
  return zlib.inflateSync(data);
}

function attempt(label, run) {
  try {
    console.log(label, run());
  } catch (error) {
    console.log(label, error.name, error.code, JSON.stringify(error.message));
  }
}

function brand(value) {
  return `${Buffer.isBuffer(value)} ${String(value)}`;
}

const words = new Uint16Array([0x6968, 0x2121]);
attempt("sync buffers", () => [brand(zlib.gunzipSync(zlib.gzipSync("g"))), brand(packSync("x").subarray(0, 0)), brand(unpackSync(packSync("u")))].join(" | "));
attempt("string", () => unpackSync(packSync("héllo")).toString());
attempt("buffer", () => unpackSync(packSync(Buffer.from("buffer bytes"))).toString());
attempt("uint16", () => unpackSync(packSync(words)).toString("latin1"));
attempt("subarray", () => unpackSync(packSync(words.subarray(1))).toString("latin1"));
attempt("dataview", () => unpackSync(packSync(new DataView(words.buffer, 2, 2))).toString("latin1"));
attempt("arraybuffer", () => unpackSync(packSync(words.buffer)).toString("latin1"));
attempt("unpack arraybuffer", () => unpackSync(new Uint8Array(zlib.deflateSync("from ab")).buffer).toString());
attempt("number", () => packSync(5));
attempt("null", () => packSync(null));
attempt("object", () => packSync({ length: 1 }));
attempt("options first", () => packSync(5, { level: 42 }));
attempt("with options", () => unpackSync(packSync("level nine", { level: 9 })).toString());

function packAsync(data, callback) {
  zlib.gzip(data, callback);
}

function unpackAsync(data, options, callback) {
  zlib.gunzip(data, options, callback);
}

packAsync("async text", (error, packed) => {
  console.log("gzip", error);
  unpackAsync(packed, { chunkSize: 64 }, (error2, plain) => console.log("gunzip", error2, plain.toString(), brand(plain)));
});
try {
  packAsync(7, () => console.log("not called"));
} catch (error) {
  console.log("async number", error.code, error.message);
}
try {
  unpackAsync(7, { level: 50 }, () => console.log("not called"));
} catch (error) {
  console.log("async options first", error.code);
}

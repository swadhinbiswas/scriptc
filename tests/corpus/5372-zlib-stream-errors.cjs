// zlib stream errors: corrupt input destroys the stream with Node's Error
// (zlib's message, errno and code; 'error' then 'close'), truncated input
// fails at the final flush with "unexpected end of file" (a stored, level
// 0 prefix decodes to the same bytes under every zlib build), a missing or
// wrong dictionary reports Z_NEED_DICT, Gunzip continues into a second
// gzip member and ignores trailing zero padding, other decoders stop at
// the stream end, and rejectGarbageAfterEnd turns trailing data, including
// a second gzip member, into ERR_TRAILING_JUNK_AFTER_STREAM_END. The dictionary blob is fixed (Node's
// deflate of the text with the dictionary "fox dog").
const zlib = require("node:zlib");

const text = "the quick brown fox jumps over the lazy dog ".repeat(40);
const gz = zlib.gzipSync(text);
const deflated = zlib.deflateSync(text);
const withDictionary = Buffer.from(
  "78bb0ab402a82bc94855282ccd4cce56482aca2fcf5348cbaf50c82acd2d2856c82f4b2d520049e724565582942a8caa1d553baa7654eda8da51b543452d004c808407",
  "hex",
);

function run(label, kind, options, data) {
  return new Promise((resolve) => {
    const stream = kind === "gunzip" ? zlib.createGunzip(options) : zlib.createInflate(options);
    const events = [];
    let length = 0;
    stream.on("data", (chunk) => (length += chunk.length));
    stream.on("error", (error) => {
      events.push(`error ${error.name} ${error.code} ${error.errno} ${JSON.stringify(error.message)}`);
      events.push(`destroyed ${stream.destroyed}`);
    });
    stream.on("end", () => events.push("end"));
    stream.on("finish", () => events.push("finish"));
    stream.on("close", () => {
      console.log(label, length, events.join(" | "));
      resolve(undefined);
    });
    stream.end(data);
  });
}

async function main() {
  await run("corrupt inflate", "inflate", undefined, Buffer.from("not zlib data at all"));
  await run("corrupt gunzip", "gunzip", undefined, Buffer.from([0x1f, 0x8b, 9, 9, 9, 9, 9, 9, 9, 9]));
  await run("truncated gunzip", "gunzip", undefined, gz.subarray(0, gz.length - 6));
  await run("truncated inflate", "inflate", undefined, zlib.deflateSync(text, { level: 0 }).subarray(0, 40));
  await run("two members", "gunzip", undefined, Buffer.concat([gz, zlib.gzipSync("second")]));
  await run("zero padding", "gunzip", undefined, Buffer.concat([gz, Buffer.alloc(8)]));
  await run("gunzip junk", "gunzip", undefined, Buffer.concat([gz, Buffer.from("junk")]));
  await run("inflate junk", "inflate", undefined, Buffer.concat([deflated, Buffer.from("junk")]));
  await run("reject junk", "inflate", { rejectGarbageAfterEnd: true }, Buffer.concat([deflated, Buffer.from("junk")]));
  await run("reject gunzip", "gunzip", { rejectGarbageAfterEnd: true }, Buffer.concat([gz, zlib.gzipSync("x")]));
  await run("missing dictionary", "inflate", undefined, withDictionary);
  await run("bad dictionary", "inflate", { dictionary: Buffer.from("other") }, withDictionary);
  await run("dictionary", "inflate", { dictionary: Buffer.from("fox dog") }, withDictionary);
}

main();

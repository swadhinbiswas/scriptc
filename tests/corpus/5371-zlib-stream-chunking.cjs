// zlib stream output chunking and event order: one compressed write
// inflates into chunkSize pieces (the output buffer fills, a new one
// starts), 'data' follows the synchronous code and its nextTick, the end()
// callback runs before 'finish', and 'end' then 'close' follow the
// flush. Each chunk is a Buffer. The write and flush callbacks,
// writableFinished, and the readable/writable flags settle in Node's order.
const zlib = require("node:zlib");

const input = Buffer.from(Array.from({ length: 2500 }, (_, i) => `row ${i * 7919}`).join("\n"));

function run(label, options, next) {
  const packed = zlib.deflateSync(input);
  const stream = zlib.createInflate(options);
  const order = [];
  const sizes = [];
  stream.on("data", (chunk) => {
    sizes.push(chunk.length);
    if (sizes.length === 1) order.push(`data ${Buffer.isBuffer(chunk)} ${JSON.stringify(String(chunk.subarray(0, 8)))}`);
  });
  stream.on("finish", () => order.push(`finish ${stream.writableFinished}`));
  stream.on("end", () => order.push(`end ${stream.readableEnded}`));
  stream.on("close", () => {
    order.push("close");
    console.log(label, order.join(" "));
    console.log("  sizes", sizes.length, sizes.slice(0, 3).join(","), sizes[sizes.length - 1]);
    console.log("  total", sizes.reduce((a, b) => a + b, 0) === input.length, stream.bytesWritten === packed.length);
    console.log("  flags", stream.destroyed, stream.writable, stream.readable);
    next();
  });
  process.nextTick(() => order.push("tick"));
  stream.write(packed, () => order.push("write cb"));
  stream.end(() => order.push("end cb"));
  order.push("sync");
}

run("default", undefined, () =>
  run("chunk 1000", { chunkSize: 1000 }, () =>
    run("chunk 64", { chunkSize: 64 }, () =>
      run("chunk 70000", { chunkSize: 70000 }, () => {
        const gz = zlib.createGzip();
        const events = [];
        gz.on("data", () => events.push("data"));
        gz.on("end", () => events.push("end"));
        gz.on("close", () => console.log("empty gzip", events.join(" ")));
        gz.end();
      }),
    ),
  ),
);

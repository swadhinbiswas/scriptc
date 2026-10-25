// zlib stream backpressure: a decoder whose output far exceeds its
// readable high-water mark pauses between output buffers until the
// consumer reads ('readable' and read() drive it), write() answers false
// while a large input waits, and a slow piped destination keeps the
// decoder's buffer near its mark.
const zlib = require("node:zlib");
const { Writable } = require("node:stream");

const input = Buffer.alloc(300000);
let seed = 12345;
for (let i = 0; i < input.length; i++) {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  input[i] = seed >> 23;
}
const packed = zlib.deflateSync(input);

const inflate = zlib.createInflate({
  readableHighWaterMark: 20000,
  writableHighWaterMark: 4096,
  chunkSize: 8192,
});
const reads = [];
let total = 0;
let largest = 0;
inflate.on("readable", () => {
  let chunk;
  const before = inflate.readableLength;
  while ((chunk = inflate.read()) !== null) total += chunk.length;
  reads.push(before);
  if (before > largest) largest = before;
});
inflate.on("end", () => {
  console.log("total", total === input.length);
  console.log("readable events", reads.length, "max buffered", largest);
  console.log("bounded", reads.every((n) => n <= 20000 + 8192));
  slowPipe();
});
const ok = inflate.write(packed, () => console.log("write callback"));
console.log("write returned", ok, inflate.writableNeedDrain);
inflate.on("drain", () => console.log("drain", inflate.writableLength));
inflate.end();

// A slow destination: each write completes on a later turn, so the decoder
// stops between output buffers until the pipe reads again.
function slowPipe() {
  const decoder = zlib.createInflate({ chunkSize: 4096, readableHighWaterMark: 4096 });
  let writes = 0;
  let received = 0;
  let largestBuffer = 0;
  const sink = new Writable({
    highWaterMark: 4096,
    write(chunk, encoding, callback) {
      writes++;
      received += chunk.length;
      if (decoder.readableLength > largestBuffer) largestBuffer = decoder.readableLength;
      setImmediate(callback);
    },
  });
  sink.on("finish", () => {
    console.log("slow pipe", writes, received === input.length, largestBuffer <= 4096 + 4096);
  });
  decoder.pipe(sink);
  decoder.end(packed);
}

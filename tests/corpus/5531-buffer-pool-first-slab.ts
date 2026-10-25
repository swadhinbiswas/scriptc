// Buffer.poolSize changes before and between pooled allocations. Node
// creates the first 64 KiB slab at startup; a pooled request (size <
// Buffer.poolSize >>> 1) that does not fit the current slab replaces it
// with a slab of the current Buffer.poolSize. Each case runs in a fresh
// child process, so its first pooled allocation meets the startup slab.
// Node's own startup code allocates from that slab, so offsets into it
// are not printed.
import { spawnSync } from "node:child_process";

const KiB = 1024;

function describe(label: string, b: Buffer, offset = true): void {
  let sum = 0;
  for (let i = 0; i < b.length; i++) sum = (sum + b[i]! * (i + 1)) % 1000003;
  console.log(label, b.length, offset ? b.byteOffset : "-", b.buffer.byteLength, sum);
}

// A follow-up allocation shows whether the slab is shared.
function follow(first: Buffer): void {
  const next = Buffer.allocUnsafe(8);
  console.log("next", next.byteOffset, next.buffer.byteLength, next.buffer === first.buffer);
}

function run(name: string): void {
  if (name === "string-ascii") {
    Buffer.poolSize = 1024 * KiB;
    const b = Buffer.from("x".repeat(100000));
    describe(name, b);
    follow(b);
  } else if (name === "string-utf8") {
    Buffer.poolSize = 1024 * KiB;
    const b = Buffer.from("é".repeat(50000));
    describe(name, b);
    follow(b);
  } else if (name === "string-hex") {
    Buffer.poolSize = 1024 * KiB;
    const b = Buffer.from("a5".repeat(100000), "hex");
    describe(name, b);
    follow(b);
  } else if (name === "string-base64") {
    Buffer.poolSize = 1024 * KiB;
    const b = Buffer.from("AQID".repeat(33334), "base64");
    describe(name, b);
    follow(b);
  } else if (name === "string-latin1") {
    Buffer.poolSize = 1024 * KiB;
    const b = Buffer.from("ÿ".repeat(100000), "latin1");
    describe(name, b);
    follow(b);
  } else if (name === "array") {
    Buffer.poolSize = 1024 * KiB;
    const values: number[] = [];
    for (let i = 0; i < 100000; i++) values.push(i);
    const b = Buffer.from(values);
    describe(name, b);
    follow(b);
  } else if (name === "uint8array") {
    Buffer.poolSize = 1024 * KiB;
    const source = new Uint8Array(100000);
    for (let i = 0; i < source.length; i++) source[i] = i * 7;
    const b = Buffer.from(source);
    describe(name, b);
    follow(b);
  } else if (name === "buffer") {
    Buffer.poolSize = 1024 * KiB;
    const b = Buffer.from(Buffer.alloc(100000, 3));
    describe(name, b);
    follow(b);
  } else if (name === "alloc-unsafe") {
    Buffer.poolSize = 1024 * KiB;
    const b = Buffer.allocUnsafe(100000).fill(9);
    describe(name, b);
    follow(b);
  } else if (name === "concat") {
    Buffer.poolSize = 1024 * KiB;
    const b = Buffer.concat([Buffer.alloc(60000, 1), Buffer.alloc(40000, 2)]);
    describe(name, b);
    follow(b);
  } else if (name === "concat-length") {
    Buffer.poolSize = 1024 * KiB;
    const b = Buffer.concat([Buffer.alloc(60000, 1), Buffer.alloc(30000, 2)], 100000);
    describe(name, b);
    follow(b);
  } else if (name === "threshold") {
    // Just under and at the enlarged threshold.
    Buffer.poolSize = 300000;
    const under = Buffer.allocUnsafe(149999).fill(1);
    describe("under", under);
    const at = Buffer.allocUnsafe(150000).fill(2);
    describe("at", at);
    follow(under);
  } else if (name === "shrink") {
    // A smaller setting keeps using the startup slab while requests fit;
    // the next slab has the new size.
    Buffer.poolSize = 64;
    const small = Buffer.from([1, 2, 3]);
    describe("small", small, false);
    const unpooled = Buffer.allocUnsafe(32).fill(4);
    describe("unpooled", unpooled);
    let last = Buffer.allocUnsafe(31);
    while (last.buffer === small.buffer) last = Buffer.allocUnsafe(31);
    const after = Buffer.allocUnsafe(20);
    console.log("moved", last.byteOffset, last.buffer.byteLength, after.byteOffset, after.buffer === last.buffer);
  } else if (name === "between") {
    // Growing and shrinking between allocations.
    const first = Buffer.allocUnsafe(1000).fill(1);
    describe("first", first, false);
    Buffer.poolSize = 1024 * KiB;
    const big = Buffer.allocUnsafe(400000).fill(5);
    describe("big", big);
    Buffer.poolSize = 128;
    const tiny = Buffer.allocUnsafe(60).fill(6);
    describe("tiny", tiny);
    console.log("same slab", tiny.buffer === big.buffer);
    Buffer.poolSize = 512 * KiB;
    const mid = Buffer.allocUnsafe(200000).fill(7);
    describe("mid", mid);
    console.log("same slab", mid.buffer === big.buffer);
    const over = Buffer.allocUnsafe(500000).fill(8);
    describe("over", over);
  }
}

const cases = [
  "string-ascii",
  "string-utf8",
  "string-hex",
  "string-base64",
  "string-latin1",
  "array",
  "uint8array",
  "buffer",
  "alloc-unsafe",
  "concat",
  "concat-length",
  "threshold",
  "shrink",
  "between",
];

const mode = process.argv.at(2);
if (mode !== undefined) {
  run(mode);
} else {
  for (const name of cases) {
    const child = spawnSync(process.execPath, [process.argv[1]!, name], { encoding: "utf8" });
    console.log(`${name}: status ${child.status}`);
    process.stdout.write(child.stdout);
    if (child.stderr.length > 0) console.log(`stderr: ${child.stderr}`);
  }
}

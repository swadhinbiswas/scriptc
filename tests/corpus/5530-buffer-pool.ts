// Buffer pooling: Buffer.from of strings, arrays and Uint8Arrays,
// Buffer.allocUnsafe and Buffer.concat return views into a shared slab of
// Buffer.poolSize bytes below poolSize >>> 1, at 8-byte aligned offsets;
// Buffer.alloc and allocUnsafeSlow own their storage. Every observation is
// recorded before printing: console output allocates from the pool too.
const rows: string[] = [];
const slabs: ArrayBufferLike[] = [];
function slabOf(b: Buffer): number {
  const size = b.buffer.byteLength;
  if (size !== 65536 && size !== 1024 && size !== 60) return -1;
  let index = slabs.indexOf(b.buffer);
  if (index < 0) {
    slabs.push(b.buffer);
    index = slabs.length - 1;
  }
  return index;
}
const note = (label: string, b: Buffer): void => {
  rows.push(`${label}: length ${b.length}, buffer ${b.buffer.byteLength}, offset ${b.byteOffset}, slab ${slabOf(b)}`);
};

// Node's module loader allocates from the pool before the program runs.
// Start from a fresh slab: a 32767-byte request at offset 0 opens one, a
// second fills it, and the next request opens another.
let start = Buffer.allocUnsafe(32767);
while (start.byteOffset !== 0) start = Buffer.allocUnsafe(32767);
Buffer.allocUnsafe(32767);
rows.push(`poolSize ${Buffer.poolSize}`);
note("allocUnsafe(1)", Buffer.allocUnsafe(1));
note("from('abc')", Buffer.from("abc"));
note("from('héllo')", Buffer.from("héllo"));
note("from('€€')", Buffer.from("€€"));
note("from('\\ud800abc')", Buffer.from("\ud800abc"));
note("allocUnsafe(3)", Buffer.allocUnsafe(3));
note("allocUnsafe(8)", Buffer.allocUnsafe(8));
note("allocUnsafe(9)", Buffer.allocUnsafe(9));
note("from([1, 2, 3])", Buffer.from([1, 2, 3]));
const values = [256, -1, 1.9, NaN];
note("from(number[])", Buffer.from(values));
note("from(Uint8Array)", Buffer.from(new Uint8Array([7, 8])));
note("from(Buffer)", Buffer.from(Buffer.from("copy")));
note("from(hex)", Buffer.from("abcd", "hex"));
note("from(bad hex)", Buffer.from("abzz", "hex"));
note("from(base64)", Buffer.from("aGVsbG8=", "base64"));
note("from(latin1)", Buffer.from("hé", "latin1"));
note("from(utf16le)", Buffer.from("€", "utf16le"));
const encoding: BufferEncoding = process.argv.length > 99 ? "hex" : "utf8";
note("from(runtime encoding)", Buffer.from("xyz", encoding));
note("concat", Buffer.concat([Buffer.from("a"), Buffer.from("bc")]));
note("concat(total)", Buffer.concat([Buffer.from("ab"), Buffer.from("cd")], 7));
note("concat([])", Buffer.concat([]));
note("from('')", Buffer.from(""));
note("allocUnsafe(0)", Buffer.allocUnsafe(0));
note("alloc(8)", Buffer.alloc(8));
note("alloc(8, 1)", Buffer.alloc(8, 1));
note("allocUnsafeSlow(8)", Buffer.allocUnsafeSlow(8));
note("subarray", Buffer.from("hello").subarray(1, 3));
note("from(ArrayBuffer)", Buffer.from(new ArrayBuffer(8)));

// Sizes at the pool threshold, slab rollover, and Buffer.poolSize.
note("from(32767 chars)", Buffer.from("a".repeat(32767)));
note("from(32768 chars)", Buffer.from("a".repeat(32768)));
note("from(11000 euro signs)", Buffer.from("€".repeat(11000)));
note("from(8191 euro signs)", Buffer.from("€".repeat(8191)));
note("allocUnsafe(32767)", Buffer.allocUnsafe(32767));
note("allocUnsafe(32768)", Buffer.allocUnsafe(32768));
note("allocUnsafe(20000)", Buffer.allocUnsafe(20000));
note("allocUnsafe(20000)", Buffer.allocUnsafe(20000));
note("from(large bad hex)", Buffer.from("zz" + "a".repeat(70000), "hex"));
Buffer.poolSize = 1024;
rows.push(`poolSize ${Buffer.poolSize}`);
note("allocUnsafe(10) after poolSize = 1024", Buffer.allocUnsafe(10));
note("allocUnsafe(600)", Buffer.allocUnsafe(600));
note("allocUnsafe(511)", Buffer.allocUnsafe(511));
// The 64 KiB slab stays current until a request does not fit; the next
// slab then has the new size.
let small = Buffer.allocUnsafe(500);
let filled = 0;
while (small.byteOffset !== 0) {
  small = Buffer.allocUnsafe(500);
  filled++;
}
note(`allocUnsafe(500) after ${filled} more`, small);
note("allocUnsafe(500)", Buffer.allocUnsafe(500));
note("allocUnsafe(500)", Buffer.allocUnsafe(500));
// A 60-byte slab leaves 4 bytes after an aligned offset of 56: enough for
// the 4-bytes-per-unit reservation of one UTF-16 unit.
Buffer.poolSize = 60;
let tiny = Buffer.allocUnsafe(29);
while (tiny.byteOffset !== 0) tiny = Buffer.allocUnsafe(29);
note("allocUnsafe(29) in a 60-byte slab", tiny);
note("allocUnsafe(20)", Buffer.allocUnsafe(20));
note("from('€', 'utf16le') in the last 4 bytes", Buffer.from("€", "utf16le"));
note("from('€€', 'utf16le')", Buffer.from("€€", "utf16le"));
note("from('é') in a new slab's room", Buffer.from("é"));
Buffer.poolSize = 0;
note("allocUnsafe(1) with poolSize 0", Buffer.allocUnsafe(1));
Buffer.poolSize = 65536;

// Views over one slab share an ArrayBuffer and see each other's bytes.
const first = Buffer.from("left");
const second = Buffer.from("right");
rows.push(`shared ArrayBuffer ${first.buffer === second.buffer}`);
const whole = new Uint8Array(first.buffer);
whole[second.byteOffset] = "R".charCodeAt(0);
rows.push(`second through the slab ${second.toString()}`);
first.fill("L");
rows.push(`first ${first.toString()} second ${second.toString()}`);

// structuredClone copies the whole slab and keeps the offset; a transfer
// of the slab is refused.
const cloned = structuredClone(first);
rows.push(`clone ${cloned.length} ${cloned.buffer.byteLength} ${cloned.byteOffset === first.byteOffset} ${new TextDecoder().decode(cloned)}`);
try {
  structuredClone(first, { transfer: [first.buffer] });
  rows.push("transfer allowed");
} catch (error) {
  rows.push(`transfer ${(error as Error).name}: ${(error as Error).message}`);
}

// Invalid sizes.
for (const size of [-1, NaN, 2 ** 53, 1.5]) {
  for (const [name, make] of [
    ["alloc", (n: number) => Buffer.alloc(n)],
    ["allocUnsafe", (n: number) => Buffer.allocUnsafe(n)],
    ["allocUnsafeSlow", (n: number) => Buffer.allocUnsafeSlow(n)],
  ] as const) {
    try {
      rows.push(`${name}(${size}) length ${make(size).length}`);
    } catch (error) {
      const e = error as Error & { code?: string };
      rows.push(`${name}(${size}) ${e.name} ${e.code}: ${e.message}`);
    }
  }
}

for (const row of rows) console.log(row);

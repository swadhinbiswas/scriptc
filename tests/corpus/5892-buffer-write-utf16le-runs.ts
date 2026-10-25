// Buffer.write(text, "utf16le") over ASCII runs of every length around the
// sixteen-byte widening steps (4732 covers the eight-byte ones): odd and even
// offsets, length limits that cut a run, and non-ASCII, astral and
// lone-surrogate units at every position of a 41-unit run.

function hex(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += (bytes[i]! < 16 ? "0" : "") + bytes[i]!.toString(16);
  return out;
}

function digest(bytes: Uint8Array): number {
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < bytes.length; i++) h = Math.imul(h ^ bytes[i]!, 0x01000193);
  return h >>> 0;
}

const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$";
function run(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += alphabet[i % alphabet.length];
  return s;
}

let summary = 0;
for (let n = 0; n <= 70; n++) {
  const text = run(n);
  for (const offset of [0, 1, 3, 16]) {
    const buf = Buffer.alloc(offset + 2 * n + 5, 0xee);
    const written = buf.write(text, offset, "utf16le");
    summary = (Math.imul(summary, 31) + written + digest(buf)) | 0;
    for (const limit of [0, 1, 15, 16, 17, 31, 32, 33]) {
      if (limit > 2 * n + 5) continue;
      const cut = Buffer.alloc(offset + 2 * n + 5, 0xee);
      const w = cut.write(text, offset, limit, "utf16le");
      summary = (Math.imul(summary, 31) + w + digest(cut)) | 0;
    }
  }
}
console.log("runs", summary);

for (const insert of ["é", "€", "😀", "\ud800", "\udc00", "\u0080", "ÿ"]) {
  let local = 0;
  for (let at = 0; at <= 40; at++) {
    const text = run(at) + insert + run(40 - at);
    const buf = Buffer.alloc(2 * text.length + 3, 0xee);
    const written = buf.write(text, 1, "utf16le");
    local = (Math.imul(local, 31) + written + digest(buf)) | 0;
    if (at === 17) console.log(JSON.stringify(insert), written, hex(buf.subarray(33, 41)));
  }
  console.log("insert", JSON.stringify(insert), local);
}

// A code-unit array the way a scanner builds one, then read back.
const source = run(1000) + "\n" + "const x = 1;\r\n".repeat(50);
const units = new Uint16Array(source.length + 4);
const n = Buffer.from(units.buffer).write(source, "utf16le");
let same = n === 2 * source.length;
for (let i = 0; i < source.length; i++) if (units[i] !== source.charCodeAt(i)) same = false;
console.log("units", n, same, units[source.length], units[source.length + 3]);

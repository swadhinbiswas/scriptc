// Buffer#write with utf16le, latin1 and ascii encodings: long ASCII runs,
// runs broken by BMP and astral characters, writes truncated by an offset
// and length budget (including odd budgets that split a UTF-16 unit or a
// surrogate pair), and the Uint16Array view a scanner builds from text.

function hex(buf: Buffer): string {
  return buf.toString("hex");
}

const texts = [
  "",
  "abc",
  "abcdefgh",
  "abcdefghijklmnopq",
  "const x = 1;\nconst y = 2;\n",
  "abcdefg\u00e9hijklmnopqrstu",
  "\u00e9abcdefghijklmnop",
  "abcdefghijklmn\u{1F600}opqrstuvwxyz0123",
  "\u4e2d\u6587abcdefghijklmnopqrstuvwxyz",
];

function show(enc: string, text: string, n: number, buf: Buffer): void {
  console.log(enc, text.length, n, hex(buf.subarray(0, n)));
}

for (const text of texts) {
  const size = text.length * 2 + 4;
  const u16 = Buffer.alloc(size);
  show("utf16le", text, u16.write(text, "utf16le"), u16);
  const l1 = Buffer.alloc(size);
  show("latin1", text, l1.write(text, "latin1"), l1);
  const as = Buffer.alloc(size);
  show("ascii", text, as.write(text, "ascii"), as);
  for (const budget of [1, 3, 7, 15, 16, 17, 33]) {
    const a = Buffer.alloc(40);
    const b = Buffer.alloc(40);
    const c = Buffer.alloc(40);
    const wa = a.write(text, 2, budget, "utf16le");
    const wb = b.write(text, 2, budget, "latin1");
    const wc = c.write(text, 2, budget, "ascii");
    console.log("  budget", budget, wa, hex(a.subarray(0, 2 + wa)), wb, hex(b.subarray(0, 2 + wb)), wc, hex(c.subarray(0, 2 + wc)));
  }
}

function toCodeUnits(text: string): Uint16Array {
  const chars = new Uint16Array(text.length + 4);
  Buffer.from(chars.buffer).write(text, "utf16le");
  return chars;
}

const source = "function f(a) {\n  return a + 1; // caf\u00e9 \u{1F600}\n}\n".repeat(40);
const units = toCodeUnits(source);
let ok = units.length === source.length + 4;
for (let i = 0; i < source.length; i++) if (units[i] !== source.charCodeAt(i)) ok = false;
console.log("code units", units.length, ok, units[source.length], units[source.length + 3]);

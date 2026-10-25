// Buffer#write with 'utf16le' (and latin1/ascii) of strings whose ASCII runs
// have every length around the eight-byte steps, mixed with non-ASCII
// characters, at offsets and byte budgets that cut runs, units and surrogate
// pairs; plus the scanner's use: a Uint16Array filled through its buffer.

function hex(bytes: Uint8Array, count: number): string {
  let out = "";
  for (let i = 0; i < count; i++) out += bytes[i]!.toString(16).padStart(2, "0");
  return out;
}

const pieces = ["", "a", "\u00e9", "\u20ac", "\ud83d\ude00", "\u007f", "\u0080"];
const strings: string[] = [];
for (let run = 0; run <= 34; run++) {
  const ascii = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGH".slice(0, run);
  for (const piece of pieces) strings.push(ascii + piece + ascii.slice(0, run % 9));
}

let lines = 0;
let checksum = 0;
for (const s of strings) {
  const size = 2 * s.length + 6;
  const out: string[] = [];
  for (const [offset, budget] of [
    [0, -1],
    [1, -1],
    [3, 7],
    [0, 16],
    [2, 17],
    [0, 2 * s.length - 1],
  ]) {
    const buf = Buffer.alloc(size, 0xee);
    const written =
      budget < 0 ? buf.write(s, offset, "utf16le") : buf.write(s, offset, Math.min(budget, size), "utf16le");
    out.push(`${written}:${hex(buf, size)}`);
  }
  const latin = Buffer.alloc(s.length + 2, 0xee);
  const writtenLatin = latin.write(s, 1, "latin1");
  const ascii = Buffer.alloc(s.length + 2, 0xee);
  const writtenAscii = ascii.write(s, 0, "ascii");
  const line = `${out.join(" ")} ${writtenLatin} ${hex(latin, latin.length)} ${writtenAscii} ${hex(ascii, ascii.length)}`;
  for (let i = 0; i < line.length; i++) checksum = (Math.imul(checksum, 31) + line.charCodeAt(i)) | 0;
  if (lines++ % 16 === 0) console.log(JSON.stringify(s), line);
}
console.log("strings", strings.length, "checksum", checksum);

// The scanner's conversion: the code units of a text, through the bytes of a Uint16Array.
function toCodeUnits(text: string): Uint16Array {
  const chars = new Uint16Array(text.length + 4);
  Buffer.from(chars.buffer).write(text, "utf16le");
  return chars;
}
let text = "";
for (let i = 0; i < 3000; i++) text += i % 97 === 0 ? "\u00e9\u20ac" : i % 211 === 0 ? "\ud83d\ude00" : "abcdefgh"[i % 8];
const units = toCodeUnits(text);
let same = units.length === text.length + 4;
for (let i = 0; i < text.length; i++) if (units[i] !== text.charCodeAt(i)) same = false;
for (let i = text.length; i < units.length; i++) if (units[i] !== 0) same = false;
let sum = 0;
for (let i = 0; i < units.length; i++) sum = (sum * 33 + units[i]!) % 1000000007;
console.log("units", text.length, units.length, same, sum);

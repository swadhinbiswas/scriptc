// While loops whose counter is bounded by a string's length: line starts
// over LF, CRLF, CR and Unicode separators, guarded second increments,
// early exits, non-ASCII and astral text, and the counter after the loop.

function lineStarts(text: string): number[] {
  const result: number[] = [];
  let lineStart = 0;
  let pos = 0;
  while (pos < text.length) {
    const ch = text.charCodeAt(pos);
    pos++;
    if (ch === 13) {
      if (pos < text.length && text.charCodeAt(pos) === 10) pos++;
    } else if (ch !== 10 && ch !== 0x2028 && ch !== 0x2029) {
      continue;
    }
    result.push(lineStart);
    lineStart = pos;
  }
  result.push(lineStart);
  return result;
}

function skipSpaces(text: string, start: number): number {
  let pos = start;
  while (pos < text.length && (text.charCodeAt(pos) === 32 || text.charCodeAt(pos) === 9)) pos++;
  return pos;
}

function countWords(text: string): number {
  let words = 0;
  let pos = 0;
  while (pos < text.length) {
    pos = skipSpaces(text, pos);
    if (pos >= text.length) break;
    words++;
    while (pos < text.length && text.charCodeAt(pos) !== 32 && text.charCodeAt(pos) !== 9) pos++;
  }
  return words;
}

function firstDigit(text: string): number {
  let pos = 0;
  while (pos < text.length) {
    const ch = text.charCodeAt(pos);
    if (ch >= 48 && ch <= 57) return pos;
    pos += 1;
    if (ch === 92) pos += 1; // skip an escaped character
  }
  return -pos;
}

function pairs(text: string): string {
  let out = "";
  let pos = 0;
  while (pos < text.length) {
    const ch = text.charCodeAt(pos++);
    if (ch >= 0xd800 && ch <= 0xdbff && pos < text.length) {
      const low = text.charCodeAt(pos);
      if (low >= 0xdc00 && low <= 0xdfff) {
        pos++;
        out += "P";
        continue;
      }
    }
    out += ch < 128 ? "a" : "u";
  }
  return out + ":" + pos;
}

const texts = [
  "",
  "a",
  "\n",
  "\r",
  "\r\n",
  "one\ntwo\nthree",
  "one\r\ntwo\r\nthree\r\n",
  "a\rb\r\rc\r\n\r\nd",
  "x y z",
  "é\r\nü\nß\r",
  "😀\r\n😀😀\n",
  "tab\tseparated\t words  here",
  "\\1 then 2",
  "no digits",
  "\ud800 lone \udc00 halves 😀",
];
for (const text of texts) {
  console.log(
    JSON.stringify(text),
    lineStarts(text).join(","),
    countWords(text),
    firstDigit(text),
    pairs(text),
    skipSpaces(text, 0),
  );
}

// A longer CRLF text, as a checkout with Windows line endings has.
let big = "";
for (let i = 0; i < 2000; i++) big += "line " + i + (i % 3 === 0 ? "\r\n" : i % 3 === 1 ? "\n" : "\r");
const starts = lineStarts(big);
let sum = 0;
for (const s of starts) sum += s;
console.log(starts.length, sum, starts[starts.length - 1], countWords(big), firstDigit(big));

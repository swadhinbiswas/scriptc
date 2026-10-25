// Sequential and random UTF-16 reads over large strings (well past 64 KiB):
// an all-ASCII text, a text with sparse non-ASCII and astral characters, a
// line-start scan in the style of a compiler scanner, alternating scans of
// two large receivers, and a uniquely owned large ASCII string that turns
// non-ASCII through an in-place append. Every result must match Node.

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

function summary(label: string, text: string): void {
  const starts = lineStarts(text);
  let sum = 0;
  for (let i = 0; i < text.length; i += 997) sum = (sum * 33 + text.charCodeAt(i)) % 1000000007;
  let back = 0;
  for (let i = text.length - 1; i >= 0; i -= 1009) back = (back * 31 + text.charCodeAt(i)) % 1000000007;
  console.log(label, text.length, starts.length, starts[starts.length - 1], starts[1000] ?? -1, sum, back);
}

const lines: string[] = [];
for (let i = 0; i < 6000; i++) lines.push(`const value${i} = compute(${i}, "text") + ${i * 3};`);
const ascii = lines.join("\n");
summary("ascii", ascii);

const mixedLines: string[] = [];
for (let i = 0; i < 6000; i++) {
  const note = i % 97 === 0 ? " // caf\u00e9 \u{1F600}" : i % 501 === 0 ? "\u2028" : "";
  mixedLines.push(`let item${i} = [${i}, ${i + 1}];${note}`);
}
const mixed = mixedLines.join(i_crlf());
summary("mixed", mixed);

function i_crlf(): string {
  return "\r\n";
}

// Alternate between the two large receivers and a short one.
let alt = 0;
const short = "s\u00e9q";
for (let i = 0; i < 20000; i += 7) {
  alt = (alt * 7 + ascii.charCodeAt(i) + mixed.charCodeAt(i) * 3 + short.charCodeAt(i % 3)) % 1000000007;
}
console.log("alternate", alt);

// Search and slice far into both.
const far = mixed.indexOf("item5999");
console.log("far", far, mixed.slice(far, far + 12), mixed.lastIndexOf("\u{1F600}"), mixed.lastIndexOf("caf\u00e9"));
const astralAt = mixed.indexOf("\u{1F600}");
console.log("astral", astralAt, mixed.charCodeAt(astralAt), mixed.charCodeAt(astralAt + 1), mixed.charAt(astralAt - 1));
console.log("ascii far", ascii.indexOf("value5999"), ascii.slice(-20), ascii.substring(100000, 100010).length);

// A large uniquely owned ASCII string read, then appended in place.
let big = "";
for (let i = 0; i < 9000; i++) big += "line" + String(i) + "\n";
console.log("big", big.length, big.charCodeAt(70000), big.charCodeAt(big.length - 1));
big += "\u00e9nd";
console.log("big+bmp", big.length, big.charCodeAt(big.length - 3), big.charCodeAt(big.length - 1), big.slice(-6));
big += "\u{1F600}";
console.log("big+astral", big.length, big.charCodeAt(big.length - 2), big.charCodeAt(big.length - 1), big.indexOf("\u00e9"));
summary("big", big);

// A large builder-made string proven ASCII by its length, then appended in
// place: the proof must not survive the append.
const rows: number[][] = [];
for (let i = 0; i < 5000; i++) rows.push([i, i * 2, i % 7]);
let doc = JSON.stringify(rows);
console.log("doc", doc.length, doc.charCodeAt(doc.length - 1), doc.indexOf("[4999"));
doc += "\u00e9\u{1F600}";
console.log("doc+", doc.length, doc.charCodeAt(doc.length - 3), doc.charCodeAt(doc.length - 2), doc.charCodeAt(doc.length - 1), doc.slice(-8));
summary("doc", doc);

// readFileSync(path | fd, "utf8") and fs.promises.readFile decode file
// bytes like Buffer#toString("utf8"): every maximal malformed subpart
// becomes one U+FFFD, a leading BOM stays U+FEFF, encoded surrogates and
// out-of-range sequences are malformed, and well-formed text (ASCII or
// not) reads back unchanged at any size and alignment.
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const file = join(tmpdir(), `scriptc-utf8-edges-${process.pid}.txt`);

function units(s: string): string {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i).toString(16));
  return out.join(" ");
}

function viaFd(): string {
  const fd = openSync(file, "r");
  try {
    return readFileSync(fd, "utf8");
  } finally {
    closeSync(fd);
  }
}

const cases: [string, number[]][] = [
  ["empty", []],
  ["ascii", [0x61, 0x62, 0x63]],
  ["bom", [0xef, 0xbb, 0xbf, 0x68, 0x69]],
  ["bom only", [0xef, 0xbb, 0xbf]],
  ["two-byte", [0xc3, 0xa9]],
  ["three-byte", [0xe2, 0x82, 0xac]],
  ["four-byte", [0xf0, 0x9f, 0x99, 0x82]],
  ["lone continuation", [0x80]],
  ["continuations", [0x61, 0x80, 0xbf, 0x62]],
  ["c0 c1 overlong", [0xc0, 0xaf, 0xc1, 0xbf]],
  ["e0 overlong", [0xe0, 0x80, 0xaf]],
  ["f0 overlong", [0xf0, 0x80, 0x80, 0xaf]],
  ["encoded high surrogate", [0xed, 0xa0, 0x80]],
  ["encoded low surrogate", [0xed, 0xbf, 0xbf]],
  ["encoded pair", [0xed, 0xa0, 0xbd, 0xed, 0xb8, 0x82]],
  ["above 10ffff", [0xf4, 0x90, 0x80, 0x80]],
  ["f5 ff", [0xf5, 0xfe, 0xff]],
  ["truncated two", [0x61, 0xc3]],
  ["truncated three", [0x61, 0xe2, 0x82]],
  ["truncated four", [0x61, 0xf0, 0x9f, 0x99]],
  ["truncated then ascii", [0xe2, 0x82, 0x41]],
  ["truncated then lead", [0xf0, 0x9f, 0xc3, 0xa9]],
  ["nul bytes", [0x00, 0x41, 0x00]],
];

for (const [name, bytes] of cases) {
  const buffer = Buffer.from(bytes);
  writeFileSync(file, buffer);
  const text = readFileSync(file, "utf8");
  const fd = viaFd();
  console.log(name, text.length, units(text), text === buffer.toString("utf8"), fd === text);
}

// Spellings Node accepts for UTF-8.
writeFileSync(file, Buffer.from([0x68, 0xc3, 0xa9, 0xff]));
console.log(
  units(readFileSync(file, "utf-8")),
  units(readFileSync(file, { encoding: "utf8" })),
  readFileSync(file, "UTF8" as BufferEncoding) === readFileSync(file, "utf8"),
  readFileSync(file, "Utf-8" as BufferEncoding) === readFileSync(file, "utf8"),
);

// Long runs exercise the word-at-a-time scan: a malformed or multibyte
// byte at every offset around 32-byte chunk boundaries, after ASCII.
let mismatches = 0;
let checked = 0;
for (let at = 0; at < 70; at++) {
  for (const tail of [[0xff], [0xc3, 0xa9], [0xe2, 0x82], [0xf0, 0x9f, 0x99, 0x82]]) {
    const bytes: number[] = [];
    for (let i = 0; i < at; i++) bytes.push(0x61 + (i % 26));
    for (const b of tail) bytes.push(b);
    for (let i = 0; i < 40; i++) bytes.push(0x30 + (i % 10));
    const buffer = Buffer.from(bytes);
    writeFileSync(file, buffer);
    const text = readFileSync(file, "utf8");
    checked++;
    if (text !== buffer.toString("utf8") || text.length !== buffer.toString("utf8").length) mismatches++;
  }
}
console.log("boundaries", checked, mismatches);

// Large files: pure ASCII, valid multibyte text, and one bad byte at the end.
const line = "linha de teste para io sequencial 0123456789\n";
let ascii = "";
for (let i = 0; i < 4000; i++) ascii += line;
writeFileSync(file, ascii);
const asciiBack = readFileSync(file, "utf8");
console.log("large ascii", asciiBack.length, asciiBack === ascii, asciiBack.charCodeAt(asciiBack.length - 2));

let wide = "";
for (let i = 0; i < 3000; i++) wide += "ação 🙂 €" + i + "\n";
writeFileSync(file, wide);
const wideBack = readFileSync(file, "utf8");
console.log("large wide", wideBack.length, wideBack === wide, wideBack.indexOf("🙂", 30000), wideBack.slice(-6, -1));

writeFileSync(file, Buffer.concat([Buffer.from(ascii), Buffer.from([0xc3])]));
const badTail = readFileSync(file, "utf8");
console.log("bad tail", badTail.length, units(badTail.slice(-2)));

// Pseudo-files report size 0 but still read to EOF (Linux only).
if (existsSync("/proc/self/status")) {
  const status = readFileSync("/proc/self/status", "utf8");
  console.log("proc", status.startsWith("Name:"), status.length > 0);
} else {
  console.log("proc", true, true);
}

async function promised(): Promise<void> {
  writeFileSync(file, Buffer.from([0xef, 0xbb, 0xbf, 0x61, 0xed, 0xa0, 0x80, 0x62, 0xf0, 0x9f]));
  const text = await readFile(file, "utf8");
  console.log("promises", units(text));
  unlinkSync(file);
}

promised().catch((error: unknown) => console.log("failed", error));

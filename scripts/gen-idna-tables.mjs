#!/usr/bin/env node
// UTS #46 tables for url.domainToASCII, url.domainToUnicode and url.parse's
// hostname conversion, matching the pinned Node release. The mapping table
// is IDNA 17.0.0. Node's label validity checks (leading combining marks,
// virama, bidi classes) use Unicode 13.0.0 character data, and its ContextJ
// rule uses the fixed joining-type sets below. Normal builds use the
// checked-in header; pass a directory holding the input files to skip the
// download.
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const inputs = [
  [
    "17.0.0/idna/IdnaMappingTable.txt",
    "87f05505dc026fdb2bff16132bdc68a8014675836882a9a2b1844540ad3be382",
  ],
  [
    "13.0.0/ucd/UnicodeData.txt",
    "bdbffbbfc8ad4d3a6d01b5891510458f3d36f7170422af4ea2bed3211a73e8bb",
  ],
];
const [mappingText, unicodeDataText] = await Promise.all(
  inputs.map(async ([path, hash]) => {
    const bytes = process.argv[2]
      ? await readFile(join(process.argv[2], path.split("/").at(-1)))
      : await (async () => {
          const response = await fetch(`https://www.unicode.org/Public/${path}`);
          if (!response.ok) throw new Error(`${path}: ${response.status}`);
          return Buffer.from(await response.arrayBuffer());
        })();
    if (createHash("sha256").update(bytes).digest("hex") !== hash)
      throw new Error(`${path}: checksum mismatch`);
    return bytes.toString("utf8");
  }),
);

// The ContextJ joining types Node's validity check recognizes (Joining_Type
// R, L and D); every other code point joins as neither.
const JOINING = {
  R: "622..625 627 629 62f..632 648 671..673 675..677 688..699 6c0 6c3..6cb 6cd 6cf 6d2..6d3 6d5 6ee..6ef 710 715..719 71e 728 72a 72c 72f 74d 759..75b 854 8aa..8ac",
  L: "a872",
  D: "620 626 628 62a..62e 633..63f 641..647 649..64a 66e..66f 678..687 69a..6bf 6c1..6c2 6cc 6ce 6d0..6d1 6fa..6fc 6ff 712..714 71a..71d 71f..727 729 72b 72d..72e 74e..758 75c..766 850..853 855 8a0 8a2..8a9 1807 1820..1877 1887..18a8 18aa a840..a871",
};

const hex = (n) => `0x${n.toString(16)}`;
const fields = (line) =>
  line
    .split("#")[0]
    .trim()
    .split(";")
    .map((x) => x.trim());

// Status codes: 0 ignored, 1 valid (deviation included: nontransitional
// processing keeps those code points), 2 disallowed, 3 mapped. A mapped
// descriptor packs the code point count (bits 24-31) and the mappings index
// (bits 8-23) above the status byte.
const mappings = [];
const mappingIndex = new Map();
const ranges = [];
for (const line of mappingText.split("\n")) {
  const f = fields(line);
  if (f.length < 2) continue;
  const [start] = f[0].split("..").map((x) => parseInt(x, 16));
  let descriptor;
  if (f[1] === "valid" || f[1] === "deviation") descriptor = 1;
  else if (f[1] === "ignored") descriptor = 0;
  else if (f[1] === "disallowed") descriptor = 2;
  else if (f[1] === "mapped") {
    const target = f[2].split(/\s+/).map((x) => parseInt(x, 16));
    const key = target.join(",");
    let index = mappingIndex.get(key);
    if (index === undefined) {
      index = mappings.length;
      mappingIndex.set(key, index);
      mappings.push(...target);
    }
    if (target.length > 0xff || index > 0xffff) throw new Error(`mapping overflow at ${f[0]}`);
    descriptor = ((target.length << 24) | (index << 8) | 3) >>> 0;
  } else throw new Error(`unknown status ${f[1]}`);
  if (ranges.length > 0 && ranges.at(-1)[1] === descriptor) continue;
  ranges.push([start, descriptor]);
}

// Bidi classes, General_Category=Mark, and Canonical_Combining_Class=9
// from UnicodeData.txt (assigned code points only).
const BIDI = [
  "NONE",
  "L",
  "R",
  "AL",
  "EN",
  "ES",
  "ET",
  "AN",
  "CS",
  "NSM",
  "BN",
  "B",
  "S",
  "WS",
  "ON",
  "LRE",
  "LRO",
  "RLE",
  "RLO",
  "PDF",
  "LRI",
  "RLI",
  "FSI",
  "PDI",
];
const bidi = new Uint8Array(0x110000);
const marks = new Uint8Array(0x110000);
const virama = [];
const rows = unicodeDataText.split("\n").filter(Boolean);
for (let i = 0; i < rows.length; i++) {
  const f = rows[i].split(";");
  const start = parseInt(f[0], 16);
  const end = f[1].endsWith(", First>") ? parseInt(rows[++i].split(";")[0], 16) : start;
  const cls = BIDI.indexOf(f[4]);
  if (cls <= 0) throw new Error(`unknown bidi class ${f[4]}`);
  for (let cp = start; cp <= end; cp++) {
    bidi[cp] = cls;
    if (f[2][0] === "M") marks[cp] = 1;
    if (f[3] === "9") virama.push(cp);
  }
}

const runs = (data) => {
  const out = [];
  for (let start = 0; start < data.length;) {
    let end = start + 1;
    while (end < data.length && data[end] === data[start]) end++;
    if (data[start]) out.push([start, end - 1, data[start]]);
    start = end;
  }
  return out;
};
const joining = new Uint8Array(0x110000);
for (const [type, value] of [
  ["R", 1],
  ["L", 2],
  ["D", 3],
]) {
  for (const item of JOINING[type].split(" ")) {
    const [start, end = start] = item.split("..").map((x) => parseInt(x, 16));
    for (let cp = start; cp <= end; cp++) joining[cp] = value;
  }
}

const wrap = (items, perLine) => {
  const lines = [];
  for (let i = 0; i < items.length; i += perLine)
    lines.push(`  ${items.slice(i, i + perLine).join(", ")},`);
  return lines;
};
const header = [
  "/* Generated by scripts/gen-idna-tables.mjs; IDNA 17.0.0 mapping table and",
  " * Unicode 13.0.0 validity data. Unicode data is licensed under",
  " * vendor/unicode/LICENSE. Do not edit. */",
  "#ifndef SCR_IDNA_DATA_H",
  "#define SCR_IDNA_DATA_H",
  "#include <stdint.h>",
  "enum { " + BIDI.map((name, index) => `SCR_BIDI_${name} = ${index}`).join(", ") + " };",
  "enum { SCR_JOIN_R = 1, SCR_JOIN_L = 2, SCR_JOIN_D = 3 };",
  "typedef struct { uint32_t start, end; uint8_t value; } ScrIdnaRange;",
  "/* { first code point, descriptor } — the run extends to the next entry. */",
  `static const uint32_t scr_idna_status[${ranges.length}][2] = {`,
  ...wrap(
    ranges.map(([start, descriptor]) => `{${hex(start)}, ${hex(descriptor)}}`),
    4,
  ),
  "};",
  `static const uint32_t scr_idna_mappings[${mappings.length}] = {`,
  ...wrap(mappings.map(hex), 10),
  "};",
  ...[
    ["scr_idna_bidi", runs(bidi)],
    ["scr_idna_marks", runs(marks)],
    ["scr_idna_joining", runs(joining)],
  ].flatMap(([name, list]) => [
    `static const ScrIdnaRange ${name}[${list.length}] = {`,
    ...wrap(
      list.map(([start, end, value]) => `{${hex(start)}, ${hex(end)}, ${value}}`),
      4,
    ),
    "};",
  ]),
  `static const uint32_t scr_idna_virama[${virama.length}] = {`,
  ...wrap(virama.map(hex), 10),
  "};",
  "#endif",
  "",
].join("\n");
await writeFile(join(root, "packages/runtime/src/scr_idna_data.h"), header);
console.log(
  `wrote ${ranges.length} status ranges, ${mappings.length} mapped code points, ${runs(bidi).length} bidi ranges`,
);

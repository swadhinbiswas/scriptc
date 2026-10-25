// util.stripVTControlCharacters on OSC sequences: each terminator (BEL,
// ESC \ and the C1 string terminator U+009C) ends the sequence at its
// first occurrence, an introducer inside the body is part of it, and an
// introducer with no terminator after it matches nothing as OSC (the CSI
// branch may still take ESC ] when a final character follows).
const { stripVTControlCharacters: strip } = require("node:util");

const cases = [
  "a\u001b]0;title\u0007b",
  "a\u001b]8;;https://example.com\u001b\\link\u001b]8;;\u001b\\b",
  "a\u001b]2;name\u009cb",
  "a\u001b]x\u001b]y\u0007b",
  "a\u001b]x\u0007y\u0007b",
  "a\u001b]unterminated",
  "a\u001b]0;t",
  "a\u001b]]]?x",
  "\u001b]\u001b]\u001b]",
  "\u001b]\u001b]\u0007",
  "a\u001b]\u001bb\u001b\\c",
  "\u001b]é😀\u0007after",
  "x\u001b]\u001b[31mred\u001b[0m",
  "\u009b31m\u001b]1\u009c",
  "\u001b]\u009c",
  "",
];
for (const value of cases) console.log(JSON.stringify(value), "->", JSON.stringify(strip(value)));

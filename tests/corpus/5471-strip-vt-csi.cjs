// util.stripVTControlCharacters on CSI and ESC sequences: the 7-bit ESC
// and 8-bit U+009B introducers, intermediates [ ] ( ) # ; ?, up to four
// digits per parameter with ';' and ':' separators, the final-character
// set, and the cases where the matcher gives back a digit or a separator
// to find a final character.
const { stripVTControlCharacters: strip } = require("node:util");

const cases = [
  "\u001b[31mred\u001b[0m",
  "\u001b[1;2;3Hpos",
  "\u001b[38:2:255:0:0mcolon",
  "\u009b1;31mC1",
  "\u001b[?25lhide",
  "\u001b(Bcharset",
  "\u001b#8align",
  "\u001b[12345mfive",
  "\u001b[1;23456;7mlong",
  "\u001b[1;2;x",
  "\u001b[1;;x",
  "\u001b[1;2;;;x",
  "\u001b[123;x",
  "\u001b[1:2:3:x",
  "\u001b[;1x",
  "\u001b[;;;x",
  "\u001b[1;2",
  "\u001b[",
  "\u001bx",
  "\u001bM",
  "\u001b\u001b[1m",
  "\u009b\u009b2J",
  "\u001b[=1h\u001b[>c\u001b[<1~",
  "\u001b[1;2Q\u001b[1;2Y",
];
for (const value of cases) console.log(JSON.stringify(value), "->", JSON.stringify(strip(value)));

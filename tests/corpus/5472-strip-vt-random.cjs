// util.stripVTControlCharacters over seeded random strings built from
// escape pieces (CSI, OSC and ESC forms, C1 introducers and terminators,
// parameters with both separators, lone surrogates), one line per case.
const { stripVTControlCharacters } = require("node:util");
const count = 1500;
let seed = 20261015;
function rand(n) {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return Math.floor((seed / 2147483648) * n);
}
const pieces = ["\u001b", "\u001b", "\u009b", "\u001b]", ";", ";", ":", "1", "12", "123", "1234", "12345", "?", "[", "]", "#", "(", "m", "~", "x", "\u0007", "\u009c", "\u001b\\", "\ud800", "\udfff", "é", "\u009d"];
for (let c = 0; c < count; c++) {
  let s = "";
  const n = 1 + rand(60);
  for (let k = 0; k < n; k++) s += pieces[rand(pieces.length)];
  console.log(JSON.stringify(stripVTControlCharacters(s)));
}

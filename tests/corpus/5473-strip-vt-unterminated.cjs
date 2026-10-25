// util.stripVTControlCharacters on long runs of OSC introducers without a
// terminator (each starts no OSC match and nothing is removed), then the
// same runs closed by a single BEL at the end (the first introducer's
// sequence takes everything), and runs mixing unterminated introducers
// with complete CSI sequences.
const { stripVTControlCharacters: strip } = require("node:util");

for (const n of [1, 10, 1000, 8000]) {
  const open = "\u001b]x".repeat(n);
  const kept = strip(open);
  const closed = strip(`${open}\u0007tail`);
  const mixed = strip("\u001b]x\u001b[31mz".repeat(n));
  console.log(n, kept.length, kept === open, JSON.stringify(closed), mixed.length, mixed.slice(0, 12));
}

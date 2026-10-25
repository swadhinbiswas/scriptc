// Times util.stripVTControlCharacters on n unterminated OSC introducers
// ("ESC ] x" repeated, and "ESC ] ]" repeated, which the CSI branch also
// rejects), printing each result's length and the elapsed milliseconds.
import { stripVTControlCharacters } from "node:util";

const n = Number(process.argv[2]);
for (const unit of ["\u001b]x", "\u001b]]"]) {
  const input = unit.repeat(n);
  const start = Date.now();
  const output = stripVTControlCharacters(input);
  console.log(JSON.stringify({ unit: JSON.stringify(unit), length: output.length, ms: Date.now() - start }));
}

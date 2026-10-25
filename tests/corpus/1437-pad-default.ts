// padStart/padEnd with the fill omitted: Node pads with spaces — the
// frontend completes the default and the island executes the same call.
console.log(`[${"ab".padEnd(5)}]`);
console.log(`[${"ab".padStart(5)}]`);
console.log(`[${"wide".padEnd(2)}]`);
console.log(`[${"7".padStart(3, "0")}]`);
const rows: [string, string][] = [
  ["Input", "$3.00"],
  ["Cache write", "$0.30"],
];
const width = Math.max(...rows.map(([label]) => label.length));
for (const [label, value] of rows) {
  console.log(`  ${label.padEnd(width + 2)}${value}`);
}

// Numbers and strings seen as unknown: negative zero, NaN, infinities,
// large and fractional values, empty and long strings, and values kept in
// and dropped from containers while new ones are created.
function show(u: unknown): string {
  if (typeof u === "number") return Object.is(u, -0) ? "-0" : String(u);
  return typeof u === "string" ? JSON.stringify(u) : String(u);
}
const values: unknown[] = [0, -0, NaN, Infinity, -Infinity, 0.1 + 0.2, 2 ** 53 + 2, -1e-300, 5e-324, "", "a", "é😀"];
console.log(values.map(show).join(" "));

function same(a: unknown, b: unknown): string {
  return `${a === b} ${Object.is(a, b)}`;
}
console.log(same(-0, 0), same(NaN, NaN), same("x" + "y", "xy"), same(1.5, 3 / 2));

// Many live boxes at once, more than are kept for reuse, then released.
const held: unknown[] = [];
for (let i = 0; i < 20000; i++) held.push(i % 3 === 0 ? `s${i}` : i + 0.25);
let sum = 0;
let chars = 0;
for (const v of held) {
  if (typeof v === "number") sum += v;
  else if (typeof v === "string") chars += v.length;
}
console.log(held.length, sum, chars);
held.length = 0;
for (let i = 0; i < 20000; i++) held.push(-i - 0.5);
console.log(held.length, held[0], held[19999]);

// Boxes replaced in a map and an object while others stay alive.
const table = new Map<string, unknown>();
const record: Record<string, unknown> = {};
for (let i = 0; i < 1000; i++) {
  table.set(`k${i % 10}`, i * 1.5);
  record[`k${i % 7}`] = `v${i}`;
}
console.log([...table.values()].map(show).join(","), Object.values(record).map(show).join(","));

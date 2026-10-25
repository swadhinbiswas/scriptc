// Many records crossing into unknown: more distinct records than are kept
// between crossings, records freed and replaced by new ones of the same
// type, and different types read through the same function.
interface Row { id: number; name: string; values: number[] }
interface Other { id: number; note: string }

function describe(u: any): string {
  return `${u.id}:${u.name ?? u.note}:${u.values ? u.values.length : "-"}`;
}
function key(u: unknown): unknown {
  return u;
}

const rows: Row[] = [];
for (let i = 0; i < 6000; i++) rows.push({ id: i, name: `n${i % 7}`, values: [i, i + 1] });

let checksum = 0;
for (let round = 0; round < 3; round++) {
  for (const row of rows) {
    const text = describe(row);
    checksum += text.length + row.id;
    if (key(row) !== key(row)) console.log("identity lost", row.id);
  }
}
console.log(checksum, describe(rows[0]), describe(rows[5999]));

// Replace rows with fresh ones; old ones are freed.
for (let i = 0; i < rows.length; i += 2) rows[i] = { id: -i, name: "fresh", values: [] };
const parts: string[] = [];
for (let i = 0; i < 6; i++) parts.push(describe(rows[i]));
console.log(parts.join(" "));

// Short-lived records of two types alternate through one function.
const out: string[] = [];
for (let i = 0; i < 2000; i++) {
  const text = i % 2 === 0 ? describe({ id: i, name: "row", values: [i] } as Row) : describe({ id: i, note: "other" } as Other);
  if (i % 400 < 2) out.push(text);
}
console.log(out.join(" "));

// Held unknown references and later conversions agree.
const held: unknown[] = rows.slice(0, 100).map((row) => row as unknown);
let agree = 0;
for (let i = 0; i < 100; i++) if (held[i] === key(rows[i])) agree++;
console.log(agree);

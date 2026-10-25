// Loop control over Object.values of unknown values: break, continue,
// return, labeled loops, exceptions from the body, and nested loops.
interface Row { a: number; b: string; c: number[]; d?: boolean }
const rows: Row[] = [
  { a: 1, b: "one", c: [1] },
  { a: 2, b: "two", c: [2, 2], d: true },
  { a: 3, b: "three", c: [] },
];

function firstString(u: any): string | null {
  for (const v of Object.values(u)) if (typeof v === "string") return v;
  return null;
}
function numbersOnly(u: any): number {
  let total = 0;
  for (const v of Object.values(u)) {
    if (typeof v !== "number") continue;
    total += v;
  }
  return total;
}
function untilArray(u: any): string[] {
  const out: string[] = [];
  for (const v of Object.values(u)) {
    if (Array.isArray(v)) break;
    out.push(String(v));
  }
  return out;
}

for (const row of rows) console.log(firstString(row), numbersOnly(row), untilArray(row).join("/"));

const pairs: string[] = [];
const second: any = rows[1];
const first: any = rows[0];
outer: for (const x of Object.values(second)) {
  for (const y of Object.values(first)) {
    if (y === "one") continue outer;
    if (x === true) break outer;
    pairs.push(`${String(x)}:${String(y)}`);
  }
}
console.log(pairs.join(" "));

function throwing(u: any): string {
  const seen: string[] = [];
  try {
    for (const v of Object.values(u)) {
      seen.push(String(v));
      if (typeof v === "string") throw new Error(`stop at ${v}`);
    }
  } catch (e) {
    seen.push((e as Error).message);
  } finally {
    seen.push("finally");
  }
  return seen.join(",");
}
console.log(throwing(rows[2]));

let calls = 0;
const counted: any = { get x() { calls++; return calls; }, y: 0 };
for (const v of Object.values(counted)) if (v === 1) break;
for (const v of Object.values(counted)) void v;
console.log(calls);

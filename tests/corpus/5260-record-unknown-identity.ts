// A typed record converted to unknown keeps one identity across separate
// conversions, including after every unknown reference to it is gone,
// and the unknown view stays live in both directions.
interface Point { x: number; y: number; label: string; tags: string[] }

function same(a: unknown, b: unknown): boolean {
  return a === b;
}
function read(u: any): string {
  return `${u.x},${u.y},${u.label},${u.tags.join("|")}`;
}

const p: Point = { x: 1, y: 2, label: "p", tags: ["a"] };
const q: Point = { x: 1, y: 2, label: "p", tags: ["a"] };
console.log(same(p, p), same(p, q), (p as unknown) === (p as unknown));

// Each call converts again; the previous unknown reference is already gone.
for (let i = 0; i < 3; i++) console.log(read(p), same(p, p));

const held: unknown = p;
console.log(held === (p as unknown), same(held, p));

// Writes through the record show through a later conversion, and writes
// through the unknown view show in the record.
p.x = 10;
p.tags.push("b");
console.log(read(p));
const view: any = p;
view.y = 20;
view.tags.push("c");
console.log(p.y, p.tags.join("|"), read(p));

// Nested records and arrays keep identity through the parent's view.
interface Box { inner: Point; list: Point[] }
const box: Box = { inner: p, list: [p, q] };
function inner(u: any): unknown {
  return u.inner;
}
console.log(inner(box) === (p as unknown), inner(box) === inner(box));
console.log(same((box as any).list[0], p), same((box as any).list[1], p));

// A record replaced by a new one of the same type answers its own values.
let current: Point = { x: 0, y: 0, label: "first", tags: [] };
const seen: string[] = [];
for (let i = 0; i < 5; i++) {
  seen.push(read(current));
  current = { x: i + 1, y: -i, label: `r${i}`, tags: [String(i)] };
}
console.log(seen.join(" "));

// for-of over Object.values of values typed unknown: typed records with
// required and optional fields, nested containers, class instances,
// arrays, strings, scalars and nullish receivers.
interface Item { id: number; name: string; tags?: string[]; score?: number; parent?: Item }

function show(u: any): string {
  const out: string[] = [];
  for (const v of Object.values(u)) out.push(typeof v === "object" ? JSON.stringify(v) : String(v));
  return out.join(" | ");
}

const root: Item = { id: 1, name: "root" };
const child: Item = { id: 2, name: "child", tags: ["a", "b"], score: 0.5, parent: root };
const cleared: Item = { id: 3, name: "cleared", tags: undefined, score: -0 };
console.log(show(root));
console.log(show(child));
console.log(show(cleared));

// Values keep their identity with the record's own containers.
function sameTags(u: any, item: Item): boolean {
  for (const v of Object.values(u)) if (Array.isArray(v)) return v === item.tags!;
  return false;
}
console.log(sameTags(child, child));

// Writes during the loop do not change the values already taken.
const live: Item = { id: 4, name: "live", score: 1 };
const seen: unknown[] = [];
const liveView: any = live;
for (const v of Object.values(liveView)) {
  seen.push(v);
  live.score = 99;
  live.name = "changed";
}
console.log(JSON.stringify(seen), live.name, live.score);

class Point {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  get sum(): number { return this.x + this.y; }
}
console.log(show(new Point(3, 4)));
console.log(show([10, "x", [1, 2]]));
console.log(show("héllo"));
console.log(show(42), show(true));

for (const bad of [null, undefined]) {
  try {
    show(bad);
  } catch (e) {
    console.log(e instanceof TypeError, (e as Error).message);
  }
}

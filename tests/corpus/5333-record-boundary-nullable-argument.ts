// A record parameter widened from a literal argument also receives a loop
// element whose storage admits undefined. The element converts to the
// widened layout after the usual checked extraction of its record arm.
interface Item {
  name: string;
  kind: number;
}
class Bag {
  readonly names = new Map<string, Item>();
  add(entry: Item): void {
    const existing = this.names.get(entry.name);
    if (existing === undefined || existing.kind < entry.kind) this.names.set(entry.name, entry);
  }
}
const seen = new Set<string>();
seen.add("x");
const parts: string[] = ["a", "d"];
const bag = new Bag();
const at = Number(process.argv.length > 99);
bag.add({ name: parts[at], kind: 1 });
function grow<T>(xs: T[], index: number, value: T): T[] {
  xs[index] = value;
  return xs;
}
const sparse = grow<number>([], 4, 1);
const groups = [
  { results: [{ name: "b", kind: 2 }, { name: "c", kind: 3 }] },
  { results: [{ name: "b", kind: 5 }] },
];
for (const g of groups) for (const res of g.results) bag.add(res);
const order: string[] = [];
for (const [name, entry] of bag.names) order.push(name + ":" + entry.kind);
console.log(order.join(","), sparse.length, seen.size);

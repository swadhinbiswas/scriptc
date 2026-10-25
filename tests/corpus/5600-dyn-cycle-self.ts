// A dyn object whose field refers back to itself, converted to a
// recursive interface: the result is one record whose field is itself.
interface Node {
  name: string;
  next?: Node;
}
const raw: any = { name: "a" };
raw.next = raw;
const n = raw as Node;
console.log(n.name, n.next?.name, n.next === n, n.next?.next === n);

// A longer ring: a -> b -> c -> a.
const a: any = { name: "a" };
const b: any = { name: "b", next: a };
const c: any = { name: "c", next: b };
a.next = c;
const ring = a as Node;
const names: string[] = [];
let cur: Node | undefined = ring;
for (let i = 0; i < 7 && cur; i++) {
  names.push(cur.name);
  cur = cur.next;
}
console.log(names.join(" "), cur === ring.next);
console.log(ring.next?.next?.next === ring);

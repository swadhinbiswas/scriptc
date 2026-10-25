// Native records with cycles seen as unknown and cast back to recursive
// interfaces: the same type, a narrower type, and repeated casts.
interface Wide {
  name: string;
  extra: number;
  next?: Wide;
}
interface Node {
  name: string;
  next?: Node;
}
const w: Wide = { name: "a", extra: 1 };
const v: Wide = { name: "b", extra: 2, next: w };
w.next = v;
const u: unknown = w;
const same = u as Wide;
console.log(same === w, same.next === v, same.next?.next === w);
const n1 = u as Node;
const n2 = u as Node;
console.log(n1.name, n1.next?.name, n1.next?.next?.name, n1 === n2);
console.log(n1.next?.next === n1, n2.next?.next === n2);
w.name = "A";
const n3 = u as Node;
console.log(n3.name, n3.next?.next?.name);

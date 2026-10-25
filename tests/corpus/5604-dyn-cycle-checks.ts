// Runtime checks over cyclic values: a function parameter typed with a
// recursive interface, Array.isArray and typeof narrowing on unknown, and
// a cyclic value passed through JSON-style round trips that stop at the
// cycle.
interface Link {
  value: number;
  next: Link | null;
}
function total(head: Link, limit: number): number {
  let sum = 0;
  let cur: Link | null = head;
  for (let i = 0; i < limit && cur; i++) {
    sum += cur.value;
    cur = cur.next;
  }
  return sum;
}
const one: any = { value: 1, next: null };
const two: any = { value: 2, next: one };
one.next = two;
console.log(total(one as Link, 5), total(two as Link, 4));

const values: unknown[] = [one, 3, "x", [one]];
for (const v of values) {
  if (Array.isArray(v)) {
    const links = v as Link[];
    console.log("array", links[0].next?.next === links[0]);
  }
  else if (typeof v === "object" && v !== null) console.log("link", (v as Link).next?.value);
  else console.log(typeof v);
}
try {
  JSON.stringify(one as Link);
} catch (e) {
  console.log(e instanceof TypeError, (e as Error).message.split("\n")[0]);
}

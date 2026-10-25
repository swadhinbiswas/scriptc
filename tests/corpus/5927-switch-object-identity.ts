// switch over objects, arrays, records and functions matches cases with ===:
// by identity, with case expressions evaluated lazily in source order.
class Mode {
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }
}
const fast = new Mode("fast");
const slow = new Mode("slow");
function label(mode: Mode | undefined): string {
  switch (mode) {
    case fast:
      return "fast";
    case slow:
      return "slow";
    case undefined:
      return "none";
    default:
      return "other";
  }
}
console.log(label(fast), label(slow), label(undefined), label(new Mode("fast")));
type Point = { x: number };
const origin: Point = { x: 0 };
function where(p: Point): string {
  switch (p) {
    case origin:
      return "origin";
    default:
      return `at ${p.x}`;
  }
}
console.log(where(origin), where({ x: 0 }));
const list = [1, 2];
const other = [1, 2];
for (const arr of [list, other]) {
  switch (arr) {
    case list:
      console.log("list");
      break;
    case other:
      console.log("other");
  }
}
const order: string[] = [];
const pick = (m: Mode): Mode => {
  order.push(m.name);
  return m;
};
switch (slow) {
  case pick(fast):
    console.log("no");
    break;
  case pick(slow):
    console.log("matched second");
    break;
  case pick(fast):
    console.log("never evaluated");
}
console.log(order.join(","));
const f = (): number => 1;
const g = (): number => 2;
switch (g as () => number) {
  case f:
    console.log("f");
    break;
  case g:
    console.log("g");
    break;
}

// Arrays that start hole-free and then gain holes, present undefined, or
// moved elements through every mutating operation. After each step the
// whole array is read back by index, by `in`, and by forEach (which skips
// holes), and then written again by index, so element reads and writes
// below and past the hole-free prefix all agree with JS semantics.
function show(label: string, xs: (number | undefined)[]): void {
  const parts: string[] = [];
  for (let i = 0; i < xs.length; i++) parts.push(i in xs ? String(xs[i]) : "_");
  let visits = 0;
  xs.forEach(() => visits++);
  console.log(label, xs.length, parts.join(","), "visits", visits);
}

function showNumbers(label: string, xs: number[]): void {
  const parts: string[] = [];
  for (let i = 0; i < xs.length; i++) parts.push(i in xs ? String(xs[i]) : "_");
  let visits = 0;
  let sum = 0;
  xs.forEach((x) => {
    visits++;
    sum += x;
  });
  console.log(label, xs.length, parts.join(","), "visits", visits, "sum", sum);
}

function rewrite(xs: number[], from: number, to: number, base: number): void {
  for (let i = from; i < to; i++) xs[i] = base + i;
}

// A hole at `at` without `delete`: copying a hole deletes the target.
function punch<T>(xs: T[], at: number): void {
  const n = xs.length;
  xs.length = n + 1;
  xs.copyWithin(at, n, n + 1);
  xs.length = n;
}

// fill, then length growth, then writes into and past the old length.
const a: number[] = new Array<number>(5).fill(1);
showNumbers("fill", a);
a[2] = 9;
showNumbers("write-in-prefix", a);
a.length = 8;
showNumbers("grow", a);
console.log("grow-in", 4 in a, 5 in a, a[6]);
a[5] = 50;
showNumbers("write-hole", a);
a[7] = 70;
showNumbers("write-last", a);
a[6] = 60;
showNumbers("close-gap", a);
a.length = 3;
showNumbers("truncate", a);
a.length = 6;
showNumbers("regrow", a);
rewrite(a, 0, 6, 100);
showNumbers("rewrite", a);

// a hole in the middle, then the hole is refilled.
const b: number[] = [1, 2, 3, 4, 5, 6];
punch(b, 2);
showNumbers("punch", b);
b[1] = 20;
b[4] = 40;
showNumbers("after-punch-writes", b);
b[2] = 30;
showNumbers("refill", b);
punch(b, 0);
punch(b, 5);
showNumbers("punch-ends", b);
b.push(7);
showNumbers("push-after-holes", b);
console.log("pop", b.pop(), b.pop(), b.length);
showNumbers("popped", b);

// sparse writes past the length and appends at the length.
const c: number[] = [];
for (let i = 0; i < 4; i++) c[i] = i * 2;
showNumbers("append-by-index", c);
c[10] = 1;
showNumbers("sparse-write", c);
for (let i = 4; i < 10; i++) c[i] = -i;
showNumbers("fill-gap", c);

// new Array(n) filled by index from the front and from the back.
const d: number[] = new Array<number>(6);
showNumbers("new-array", d);
for (let i = 0; i < 3; i++) d[i] = i;
showNumbers("front-half", d);
for (let i = 5; i >= 3; i--) d[i] = i;
showNumbers("back-half", d);

// present undefined in a nullable array.
const e: (number | undefined)[] = [1, 2, 3, 4];
e[1] = undefined;
show("undefined", e);
e[1] = 5;
e[3] = undefined;
show("undefined-last", e);
e.length = 6;
show("undefined-grow", e);
e.fill(undefined, 4);
show("fill-undefined", e);
e.fill(8);
show("fill-all", e);

// structural operations on hole-free and holey arrays.
for (const holey of [false, true]) {
  const tag = holey ? "holey" : "packed";
  const make = (): number[] => {
    const xs: number[] = [10, 11, 12, 13, 14, 15, 16];
    if (holey) punch(xs, 3);
    return xs;
  };
  const s = make();
  console.log(tag, "shift", s.shift());
  showNumbers(tag + "-shift", s);
  s[0] = 1;
  s[s.length - 1] = 2;
  showNumbers(tag + "-shift-write", s);
  const u = make();
  u.unshift(1, 2);
  showNumbers(tag + "-unshift", u);
  u[3] = 3;
  showNumbers(tag + "-unshift-write", u);
  const sp = make();
  const removed = sp.splice(1, 2);
  showNumbers(tag + "-splice", sp);
  showNumbers(tag + "-removed", removed);
  sp.splice(2, 0, 7, 8, 9);
  showNumbers(tag + "-splice-insert", sp);
  sp[4] = 4;
  showNumbers(tag + "-splice-write", sp);
  const r = make();
  r.reverse();
  showNumbers(tag + "-reverse", r);
  r[3] = 33;
  showNumbers(tag + "-reverse-write", r);
  const so = make();
  so.sort((x, y) => y - x);
  showNumbers(tag + "-sort", so);
  so[so.length - 1] = 99;
  showNumbers(tag + "-sort-write", so);
  const cw = make();
  cw.copyWithin(0, 3, 6);
  showNumbers(tag + "-copy-within", cw);
  cw[1] = 1;
  showNumbers(tag + "-copy-within-write", cw);
  const sl = make().slice(2, 6);
  showNumbers(tag + "-slice", sl);
  sl[1] = 1;
  showNumbers(tag + "-slice-write", sl);
  const cc = make().concat(make());
  showNumbers(tag + "-concat", cc);
  cc[3] = 3;
  showNumbers(tag + "-concat-write", cc);
  const m = make().map((x) => x * 2);
  showNumbers(tag + "-map", m);
  const f = make().filter((x) => x % 2 === 0);
  showNumbers(tag + "-filter", f);
}

// references: overwrite, punch, truncate and regrow string and object arrays.
class Box {
  v: number;
  constructor(v: number) {
    this.v = v;
  }
}
const names: string[] = ["a", "b", "c", "d"].map((s) => s + s);
names[1] = "x" + names[0];
punch(names, 2);
names.length = 6;
names[5] = "tail";
const nameParts: string[] = [];
for (let i = 0; i < names.length; i++) nameParts.push(i in names ? names[i]! : "_");
console.log("names", nameParts.join(","));
const boxes: Box[] = [];
for (let i = 0; i < 5; i++) boxes.push(new Box(i));
boxes[2] = new Box(20);
punch(boxes, 3);
boxes.length = 4;
boxes[1] = new Box(10);
let boxSum = 0;
boxes.forEach((box) => (boxSum += box.v));
console.log("boxes", boxes.length, 3 in boxes, boxSum, boxes[0]!.v, boxes[2]!.v);

// boolean flags: holes read as undefined (falsy) until written.
const flags: boolean[] = new Array<boolean>(8).fill(false);
for (let i = 2; i < 8; i += 2) flags[i] = true;
flags.length = 10;
let truthy = 0;
for (let i = 0; i < flags.length; i++) if (flags[i]) truthy++;
console.log("flags", truthy, 9 in flags, flags.indexOf(true), flags.lastIndexOf(false));
flags[9] = true;
flags[8] = true;
truthy = 0;
for (let i = 0; i < flags.length; i++) if (flags[i]) truthy++;
console.log("flags-written", truthy, flags.join(""));

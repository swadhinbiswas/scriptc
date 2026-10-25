// boolean[] keeps one byte per element in dense storage. Every array
// operation reads and writes those bytes: element access below and past the
// hole-free prefix, growth and truncation, the moving operations (push, pop,
// shift, unshift, splice, reverse, copyWithin), the copying ones (slice,
// concat, spread, toReversed, toSpliced, with), fill, sort, search, join,
// iteration and JSON. Holes and present undefined stay distinct throughout.
function show(label: string, xs: boolean[]): void {
  const parts: string[] = [];
  for (let i = 0; i < xs.length; i++) parts.push(i in xs ? String(xs[i]) : "_");
  let visits = 0;
  let trues = 0;
  xs.forEach((x) => {
    visits++;
    if (x) trues++;
  });
  console.log(label, xs.length, parts.join(","), "visits", visits, "trues", trues);
}

function showMaybe(label: string, xs: (boolean | undefined)[]): void {
  const parts: string[] = [];
  for (let i = 0; i < xs.length; i++) parts.push(i in xs ? String(xs[i]) : "_");
  let visits = 0;
  xs.forEach(() => visits++);
  console.log(label, xs.length, parts.join(","), "visits", visits);
}

// A hole at `at` without `delete`: copying a hole deletes the target.
function punch(xs: boolean[], at: number): void {
  const n = xs.length;
  xs.length = n + 1;
  xs.copyWithin(at, n, n + 1);
  xs.length = n;
}

// Element writes inside, at and past the length.
const a: boolean[] = new Array<boolean>(6).fill(false);
show("fill", a);
a[1] = true;
a[4] = true;
show("write", a);
a[8] = true;
show("write-past", a);
console.log("in", 6 in a, 7 in a, 8 in a, a[7]);
a[6] = false;
a[7] = true;
show("close-gap", a);
a.length = 3;
show("truncate", a);
a.length = 5;
show("regrow", a);
a[3] = true;
a[4] = false;
show("rewrite", a);

// Moving operations.
const b: boolean[] = [true, false, true, true, false, false, true];
punch(b, 2);
show("punch", b);
console.log("push", b.push(true), b.push(false, true));
show("pushed", b);
console.log("pop", b.pop(), b.pop(), b.length);
console.log("shift", b.shift(), b.shift(), b.length);
show("shifted", b);
console.log("unshift", b.unshift(false), b.unshift(true, true));
show("unshifted", b);
console.log("splice", b.splice(1, 2).join(","));
show("spliced", b);
console.log("splice-insert", b.splice(2, 1, true, false, false).join(","));
show("inserted", b);
b.splice(0, 2, false);
show("splice-statement", b);
b.reverse();
show("reverse", b);
b.copyWithin(0, 3, 6);
show("copyWithin", b);
const holey: boolean[] = [true, false, true, false];
punch(holey, 1);
holey.reverse();
show("reverse-holes", holey);
console.log("shift-hole", holey.shift(), holey.shift(), holey.length);
show("after-shift-hole", holey);

// Copying operations preserve holes, except where iteration reads them.
const c: boolean[] = [false, true, false, true, true];
punch(c, 3);
show("source", c);
show("slice", c.slice(1, 5));
show("slice-neg", c.slice(-3));
show("concat", c.concat([true], c));
show("spread", [...c, false]);
show("toReversed", c.toReversed());
show("toSpliced", c.toSpliced(1, 2, true));
show("with", c.with(0, true));
show("from", Array.from(c));
const d: boolean[] = [];
d.push(...c);
show("push-spread", d);
d.unshift(...c);
show("unshift-spread", d);

// fill, sort and search.
const e: boolean[] = new Array<boolean>(10).fill(true, 0, 10);
e.fill(false, 2, 5);
e.fill(false, -2);
show("fill-range", e);
show("toSorted", e.toSorted());
e.sort();
show("sort", e);
const f: boolean[] = [true, false, false, true];
f.sort((x, y) => Number(y) - Number(x));
show("sort-cmp", f);
console.log("indexOf", e.indexOf(true), e.indexOf(false), e.lastIndexOf(false), [true].indexOf(false));
console.log("includes", e.includes(true), [false, false].includes(true));
console.log("find", e.find((x) => x), e.findIndex((x) => x), e.findLast((x) => !x), e.findLastIndex((x) => !x));
console.log("some/every", e.some((x) => x), e.every((x) => x), [true, true].every((x) => x));
console.log("count", e.filter((x) => x).length, e.map((x) => (x ? 1 : 0)).join(""));
console.log("reduce", e.reduce((n, x) => (x ? n + 1 : n), 0));

// Strings, iteration and JSON.
const g: boolean[] = [true, false, true];
punch(g, 1);
console.log("join", g.join(), g.join(" | "), String(g), `${g}`);
const seen: string[] = [];
for (const x of g) seen.push(String(x));
for (const [i, x] of g.entries()) seen.push(`${i}:${x}`);
for (const i of g.keys()) seen.push(`k${i}`);
console.log("iterate", seen.join(" "));
console.log("json", JSON.stringify(g), JSON.stringify([true, false]), JSON.stringify({ flags: [false, true] }));
const parsed: boolean[] = JSON.parse("[true,false,false,true]") as boolean[];
parsed.push(true);
console.log("parsed", parsed.length, parsed[3], parsed.join(","));
console.log("inspect", [true, false], g);

// Sets of booleans in both directions.
const fromArray = new Set<boolean>([true, true, false, true]);
console.log("set", fromArray.size, fromArray.has(false));
const back: boolean[] = [...fromArray];
back.push(false);
show("set-spread", back);
show("set-from", Array.from(new Set<boolean>([false, true])));

// Nested arrays and flat.
const grid: boolean[][] = [[true, false], [false], [true, true, false]];
grid[1]![3] = true;
show("flat", grid.flat());
console.log("grid", grid.map((row) => row.join("")).join("/"));

// Present undefined stays distinct from a hole.
const m: (boolean | undefined)[] = [true, undefined, false];
m[4] = true;
showMaybe("maybe", m);
m.splice(1, 0, undefined, false);
showMaybe("maybe-splice", m);
showMaybe("maybe-slice", m.slice(1));
showMaybe("maybe-reverse", m.reverse());
console.log("maybe-includes", m.includes(undefined), m.indexOf(undefined), m.indexOf(false));
console.log("maybe-json", JSON.stringify(m));
const n: (boolean | undefined)[] = new Array<boolean | undefined>(4).fill(undefined);
n[2] = true;
showMaybe("maybe-fill", n);

// Growth across allocation sizes, large sparse indices and densifying.
const big: boolean[] = [];
for (let i = 0; i < 70000; i++) big.push(i % 3 === 0);
let bigTrues = 0;
for (let i = 0; i < big.length; i++) if (big[i]) bigTrues++;
console.log("big", big.length, bigTrues, big[69999], big.lastIndexOf(true));
const sparse: boolean[] = [true];
sparse[3000000] = true;
sparse[2000000] = false;
console.log("sparse", sparse.length, 1 in sparse, sparse[2000000], sparse[3000000], sparse.indexOf(false));
for (let i = 1; i < 200; i++) sparse[i] = i % 2 === 0;
console.log("sparse-dense", sparse.slice(0, 6).join(","), sparse.indexOf(false), sparse.includes(false));
sparse.length = 4;
show("sparse-truncate", sparse);
const sieve: boolean[] = new Array<boolean>(100001).fill(false);
let primes = 0;
for (let i = 2; i <= 100000; i++) {
  if (sieve[i]) continue;
  primes++;
  for (let j = i * i; j <= 100000; j += i) sieve[j] = true;
}
console.log("sieve", primes, sieve.indexOf(false, 100), sieve.lastIndexOf(false));

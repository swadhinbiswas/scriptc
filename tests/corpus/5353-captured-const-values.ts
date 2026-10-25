// Closures read captured bindings that nothing writes after their
// initialization as plain values: const and never-reassigned let bindings,
// unchanged parameters, loop-body declarations (one value per iteration),
// nested closures, generators, async functions and local class methods.
// Objects mutated through such a capture stay shared, and a binding that
// any function reassigns stays one shared cell for every closure.

function grid(): void {
  const N = 6;
  let scale = 3; // never reassigned
  const cells: number[] = [];
  function fill(seed: number): void {
    for (let i = 0; i < N * N; i++) cells.push(((seed + i) * scale) % 7);
  }
  function at(r: number, c: number): number {
    return cells[r * N + c]!;
  }
  fill(2);
  let trace = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) trace += r === c ? at(r, c) : 0;
  console.log("grid", cells.length, trace, at(N - 1, N - 1));
}
grid();

function perIteration(): void {
  const fns: (() => string)[] = [];
  const prefix = "item";
  for (let i = 0; i < 4; i++) {
    const label = prefix + i;
    const doubled = i * 2;
    fns.push(() => label + ":" + doubled);
  }
  for (const word of ["a", "bb", "ccc"]) {
    const size = word.length;
    fns.push(() => word + "/" + size);
  }
  console.log("loops", fns.map((f) => f()).join(" "));
}
perIteration();

function makeAdder(n: number): (x: number) => number {
  return (x) => (x * 31 + n) % 1000003;
}
function applyN(f: (x: number) => number, times: number, start: number): number {
  let v = start;
  for (let i = 0; i < times; i++) v = f(v);
  return v;
}
let adders = 0;
for (let k = 1; k <= 20; k++) adders += applyN(makeAdder(k % 5), 1000, k);
console.log("adders", adders);

function nested(base: number): () => () => number {
  const offset = base * 10;
  return () => {
    const inner = offset + 1;
    return () => base + offset + inner;
  };
}
const level1 = nested(4);
console.log("nested", level1()(), nested(-2)()());

function sharedObject(): void {
  const box = { count: 0, items: [] as string[] };
  const bump = (tag: string): void => {
    box.count++;
    box.items.push(tag);
  };
  bump("x");
  bump("y");
  box.items.push("z");
  console.log("object", box.count, box.items.join(","));
}
sharedObject();

function sharedCell(): void {
  let total = 1;
  const read = (): number => total;
  const add = (n: number): void => {
    total += n;
  };
  console.log("cell", read());
  add(5);
  console.log("cell", read(), total);
  total = 100;
  console.log("cell", read());
  let late = "first";
  const show = (): string => late;
  late = "second";
  console.log("cell", show());
}
sharedCell();

function* counter(limit: number): Generator<number> {
  const step = 3;
  const values = [10, 20, 30];
  const pick = (i: number): number => values[i % values.length]! + step;
  for (let i = 0; i < limit; i++) yield pick(i) + limit;
}
console.log("generator", [...counter(5)].join(","));

function makeGen(start: number): () => Generator<string, void, unknown> {
  const tag = "g" + start;
  return function* () {
    for (let i = start; i < start + 3; i++) yield tag + "-" + i;
  };
}
console.log("generator", [...makeGen(7)()].join(","));

async function delayed(label: string): Promise<string> {
  const suffix = "!";
  const parts: string[] = [];
  const add = async (n: number): Promise<void> => {
    await Promise.resolve();
    parts.push(label + n + suffix);
  };
  await add(1);
  await add(2);
  return parts.join(" ");
}

function classes(): void {
  const unit = "cm";
  const factor = 2.5;
  class Ruler {
    readonly length: number;
    constructor(length: number) {
      this.length = length;
    }
    describe(): string {
      return this.length * factor + unit;
    }
  }
  const rulers = [new Ruler(1), new Ruler(4)];
  console.log("class", rulers.map((r) => r.describe()).join(" "));
}
classes();

function strings(words: string[]): () => string {
  const sep = ", ";
  const head = words[0]!;
  return () => head + ": " + words.slice(1).join(sep);
}
const joined = strings(["list", "a", "b", "c"]);
console.log("strings", joined(), joined());

delayed("async").then((value) => console.log("async", value));

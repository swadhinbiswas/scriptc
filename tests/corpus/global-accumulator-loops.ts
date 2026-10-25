// Module-level number bindings updated in top-level loops. Bindings only
// the module body touches may live in registers; any binding a function,
// closure, getter or later reader can observe must stay exact at every
// call, throw and exit.

class Item {
  v: number;
  constructor(v: number) {
    this.v = v;
  }
  weight(): number {
    return this.v * 2;
  }
}
const items: Item[] = [];
for (let i = 0; i < 50; i++) items.push(new Item(i % 7));

// Private to the module body: calls in the loop cannot see it.
let privateTotal = 0;
for (let r = 0; r < 20; r++) {
  for (const it of items) privateTotal += it.weight() + Math.sqrt(it.v);
}
console.log("private", privateTotal.toFixed(6));

// Read by a function the loop calls.
let observed = 0;
const seen: number[] = [];
function peek(): void {
  seen.push(observed);
}
for (let i = 0; i < 10; i++) {
  observed += i;
  if (i % 3 === 0) peek();
}
console.log("observed", observed, seen.join(","));

// Written by a function the loop calls.
let shared = 1;
function double(): void {
  shared *= 2;
}
for (let i = 0; i < 6; i++) {
  shared += 1;
  if (i % 2 === 1) double();
}
console.log("shared", shared);

// Captured by a closure invoked in the loop.
let counter = 0;
const tick = (): number => ++counter;
let ticks = 0;
for (let i = 0; i < 8; i++) {
  counter += 10;
  ticks += tick();
}
console.log("closure", counter, ticks);

// Read through a getter.
let reads = 0;
class Gauge {
  get level(): number {
    return reads * 3;
  }
}
const gauge = new Gauge();
let levels = 0;
for (let i = 0; i < 5; i++) {
  reads++;
  levels += gauge.level;
}
console.log("getter", reads, levels);

// An exception leaves the loop midway; the catch and later code see the
// value as of the throw.
let partial = 0;
function check(v: number): number {
  if (v === 13) throw new Error("unlucky " + v);
  return v;
}
try {
  for (let i = 0; i < 100; i++) partial += check(i);
} catch (e) {
  console.log("caught", (e as Error).message, partial);
}
console.log("partial", partial);

// break, continue and labeled exits, plus try/finally inside the loop.
let steps = 0;
let finals = 0;
outer: for (let i = 0; i < 10; i++) {
  for (let j = 0; j < 10; j++) {
    if (j === 3) continue;
    if (j === 7) continue outer;
    if (i === 6) break outer;
    try {
      steps += i * j;
      if ((i + j) % 5 === 0) break;
    } finally {
      finals++;
    }
  }
}
console.log("steps", steps, finals);

// Read later by a function called after the loop.
let late = 0;
for (let i = 0; i < 1000; i++) late += i % 7;
function report(): string {
  return "late=" + late;
}
console.log(report());

// An integer accumulator alongside a float one.
let ints = 0;
let floats = 0.5;
for (let i = 0; i < 300; i++) {
  ints = (ints + i * 7) % 1009;
  floats = floats * 1.01 + ints / 1000;
}
console.log("mixed", ints, floats.toFixed(9));

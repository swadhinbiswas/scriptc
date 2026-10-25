// Top-level var, let and const bindings with later compound updates,
// including var hoisting.
var hits = 3;
console.log("hits++", hits++);
var level = 10;
function lower(): number {
  return (level -= 4);
}
console.log("level", lower(), lower());

// A var updated only from a function called after its declaration.
var late = 5;
function early(): number {
  return late++;
}
console.log("late", early(), early());

// Redeclared var keeps one binding.
var twice = 1;
var twice = twice + 1;
console.log("twice++", twice++);

// const containers updated in place.
const counters = { a: 1, b: 2 };
counters.a++;
console.log("counters.b *= 3", (counters.b *= 3), counters.a);
const list = [5, 6];
console.log("list[1]--", list[1]--, list.join(","));
const nested = { inner: { n: 0 } };
console.log("nested.inner.n += 2", (nested.inner.n += 2));

// let updated in branches and loops only.
let flips = 0;
for (const v of [true, false, true]) if (v) flips++;
console.log("flips", 0);
let budget = 5;
while (budget > 0) budget -= 2;
console.log("budget", budget);
let tally = 1;
if (Math.random() < 2) tally += 41;
console.log("tally done");
let ratio = 1;
for (let i = 0; i < 4; i++) ratio /= 2;
console.log("ratio", 1);

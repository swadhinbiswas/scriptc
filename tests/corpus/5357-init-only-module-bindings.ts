// Module `let`/`var` bindings written only by their declaration read like
// constants; every other shape keeps observing writes and early reads.

function earlyLet(): number {
  return LATE_LET + 1;
}
function earlyVar(): string {
  return String(LATE_VAR);
}
try {
  console.log("early let", earlyLet());
} catch (e) {
  console.log("early let threw", (e as Error).name, (e as Error).message);
}
console.log("early var", earlyVar());
let LATE_LET = 41;
var LATE_VAR = 7;
console.log("late", earlyLet(), earlyVar());

// Init-only numbers bound loops in other functions.
let SIZE = 24;
var STRIDE = 3;
let LIMIT = Number(process.argv[2] ?? "97");
let SCALE = SIZE * STRIDE;
function grid(): number {
  let total = 0;
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j += STRIDE) total = (total + i * SIZE + j) % LIMIT;
  }
  return total + SCALE;
}
console.log("grid", grid(), SIZE, STRIDE, LIMIT, SCALE);

// Written again later by a function: stays a live binding.
let counter = 10;
function bump(): number {
  counter += 5;
  return counter;
}
function readCounter(): number {
  return counter;
}
console.log("counter", readCounter(), bump(), readCounter());

// Declared without a value and assigned once from a function.
let deferred: number;
function setDeferred(): void {
  deferred = 99;
}
function readDeferred(): number {
  return deferred;
}
setDeferred();
console.log("deferred", readDeferred());

// Assigned in a nested statement or a loop at module level.
let fromBlock = 1;
if (process.argv.length > 100) fromBlock = 2;
let fromLoop = 0;
for (let i = 0; i < 4; i++) fromLoop += i;
function readNested(): string {
  return `${fromBlock}/${fromLoop}`;
}
console.log("nested", readNested());

// A redeclared var has two writes.
var twice = 1;
function readTwice(): number {
  return twice;
}
console.log("twice before", readTwice());
var twice = 2;
console.log("twice after", readTwice());

// Objects held by init-only bindings still mutate through them.
let table: number[] = [];
function fill(n: number): number {
  for (let i = 0; i < n; i++) table.push(i * SIZE);
  return table.length;
}
console.log("table", fill(5), table.join(","));
let config = { mode: "fast", level: 1 };
function raise(): string {
  config.level++;
  return `${config.mode}:${config.level}`;
}
console.log("config", raise(), raise());

// Callbacks and timers read the settled value.
let OFFSET = 1000;
const mapped = [1, 2, 3].map((x) => x + OFFSET);
console.log("mapped", mapped.join(","));
setTimeout(() => console.log("timer", OFFSET + SIZE, LATE_LET), 0);

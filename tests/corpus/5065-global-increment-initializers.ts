// Module-level bindings whose only later use is ++ or --: the initializer
// must still run before the update reads the binding.
function f(x: number): { done: boolean; v: number } {
  return { done: x > 3, v: x };
}
let tr = f(0);
let n = 2;
while (!tr.done) {
  console.log(tr.v);
  tr = f(n++);
}

const id = (x: number): number => x;
let a = 2;
console.log("a++", id(a++));
let b = 2;
console.log("b--", id(b--));
let c = 2;
console.log("++c", id(++c));
let d = 2;
console.log("--d", id(--d));

// Updates in statement position and loop conditions.
let ticks = 3;
while (ticks-- > 0) console.log("tick");
let up = -2;
do console.log("up", up); while (++up < 1);
let steps = 10;
for (let i = 0; i < 3; i++) console.log("steps", steps--);

// Floating-point and negative starting values.
let half = 0.5;
console.log("half++", half++);
let neg = -1;
console.log("--neg", --neg);
let big = 9007199254740991;
console.log("big++", big++);

// BigInt updates.
let count = 10n;
console.log("count++", String(count++));
let back = 1n;
console.log("--back", String(--back));

// Several declarators in one statement.
let x1 = 5,
  x2 = 6;
console.log("x1++ x2--", x1++, x2--);

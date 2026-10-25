// Closures capturing `any` (island-handle) variables: the capture box
// carries the handle with its own retain/release — reads see the live
// value, mutation through the box is visible everywhere (the shared-box
// contract every captured binding has), and independent closures own
// independent boxes.

const obj = { n: 10, label: "L" };
const captured: any = obj;
const read = (): string => `${captured.label}:${captured.n}`;
console.log(read());
captured.n = 11;
console.log(read());

// Mutating the CAPTURED BINDING from inside the closure.
let mut: any = 1;
const bump = (): number => {
  mut = (mut as number) + 1;
  return mut as number;
};
console.log(bump(), bump(), mut as number);

// Each call of the maker gets its own box.
const mk = (start: any): (() => number) => {
  let acc: any = start;
  return () => {
    acc = (acc as number) + 100;
    return acc as number;
  };
};
const c1 = mk(1);
const c2 = mk(50);
console.log(c1(), c2(), c1(), c2());

// Capture through TWO function layers (the capture threads each frame).
function outer(): string {
  const h: any = { deep: "yes" };
  const mid = (): string => {
    const inner = (): string => `${h.deep}`;
    return inner();
  };
  return mid();
}
console.log(outer());

// A captured handle passed back into island operations.
const parts: any = ["a", "b", "c"];
const join = (sep: string): string => `${parts.join(sep)}`;
console.log(join("-"), join("+"));

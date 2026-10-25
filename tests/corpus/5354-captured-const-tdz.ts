// Closures created before a captured binding's initialization keep Node's
// temporal dead zone: a call before the declaration throws the catchable
// ReferenceError, a call after it reads the value, and a path that never
// reads the binding runs normally before initialization. Bindings declared
// before every capture read their value through hoisted helpers.

function early(): void {
  function readLimit(): number {
    return limit * 2;
  }
  function maybe(flag: boolean): number {
    return flag ? limit : -1;
  }
  try {
    console.log("early", readLimit());
  } catch (e) {
    console.log("early", (e as Error).name, (e as Error).message);
  }
  console.log("maybe", maybe(false));
  const limit = 21;
  console.log("late", readLimit(), maybe(true));
}
early();

function selfReference(): void {
  const fib = (n: number): number => (n < 2 ? n : fib(n - 1) + fib(n - 2));
  console.log("self", fib(15));
  try {
    const run = (f: () => number): number => f();
    const value: number = run(() => value + 1);
    console.log("self", value);
  } catch (e) {
    console.log("self", (e as Error).name, (e as Error).message);
  }
}
selfReference();

function loopTdz(): void {
  const results: string[] = [];
  for (let i = 0; i < 3; i++) {
    const show = (): string => "v" + value;
    if (i === 1) {
      try {
        results.push(show());
      } catch (e) {
        results.push((e as Error).name);
      }
    }
    const value = i * 5;
    results.push(show());
  }
  console.log("loop", results.join(" "));
}
loopTdz();

function ordered(): void {
  const size = 4;
  const label = "row";
  function row(i: number): string {
    let out = label + i + ":";
    for (let j = 0; j < size; j++) out += " " + i * size + j;
    return out;
  }
  for (let i = 0; i < size; i++) console.log(row(i));
}
ordered();

// Helpers declared above the bindings they capture read those bindings'
// values once they are initialized. Any way of running a helper before the
// initialization keeps Node's temporal dead zone: a call inside the
// initializer itself, a helper that escaped through another call first, a
// helper reached through another helper, and per-iteration declarations.

function ordered(): void {
  function total(): number {
    let s = 0;
    for (let i = 0; i < N; i++) s += values[i]! * SCALE;
    return s;
  }
  const label = (): string => "n=" + N + " scale=" + SCALE;
  const N = 50;
  const SCALE = 3;
  const values: number[] = [];
  for (let i = 0; i < N; i++) values.push(i % 7);
  console.log("ordered", total(), label());
}
ordered();

function inInitializer(): void {
  function twice(): number {
    return LIMIT * 2;
  }
  const LIMIT: number = twice();
  console.log("initializer", LIMIT);
}
try {
  inInitializer();
} catch (e) {
  console.log("initializer", (e as Error).name, (e as Error).message);
}

function escaped(): void {
  const run = (g: () => number): number => g();
  function read(): number {
    return VALUE + 1;
  }
  try {
    console.log("escaped", run(read));
  } catch (e) {
    console.log("escaped", (e as Error).name, (e as Error).message);
  }
  const VALUE = 41;
  console.log("escaped", run(read), read());
}
escaped();

function chained(): void {
  function outer(): string {
    return inner() + "!";
  }
  function inner(): string {
    return WORD.toUpperCase();
  }
  try {
    console.log("chained", outer());
  } catch (e) {
    console.log("chained", (e as Error).name);
  }
  const WORD = "done";
  console.log("chained", outer(), inner());
}
chained();

function perIteration(): void {
  const out: string[] = [];
  for (let i = 0; i < 3; i++) {
    const describe = (): string => tag + ":" + i;
    const tag = "t" + i * i;
    out.push(describe());
  }
  console.log("loop", out.join(" "));
}
perIteration();

function generatorHelper(): void {
  function* steps(): Generator<number> {
    for (let i = 0; i < COUNT; i++) yield i * STEP;
  }
  const COUNT = 4;
  const STEP = 5;
  console.log("generator", [...steps()].join(","));
}
generatorHelper();

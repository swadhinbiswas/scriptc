// Module-level bindings read only by updates inside functions, closures,
// class members, generators, async functions and callbacks.
function takeTicket(): number {
  return ticket++;
}
let ticket = 100;
console.log("ticket", takeTicket(), takeTicket());

const nextId = (): number => ++lastId;
let lastId = 50;
console.log("lastId", nextId(), nextId());

let total = 1;
function accumulate(by: number): number {
  return (total *= by);
}
console.log("total", accumulate(2), accumulate(3));

class Pool {
  static take(): number {
    return free--;
  }
  grow(by: number): number {
    return (free += by);
  }
  get size(): number {
    return ++free - 1;
  }
}
let free = 7;
console.log("free", Pool.take(), new Pool().grow(10), new Pool().size);

function* serials(): Generator<number, void, undefined> {
  for (let i = 0; i < 3; i++) yield serial++;
}
let serial = 1000;
console.log("serial", [...serials()].join(","));

async function nextAsync(): Promise<number> {
  await null;
  return asyncCount++;
}
let asyncCount = 40;

let mapped = 0;
const doubled = [1, 2, 3].map((x) => x * 2 + mapped++);
console.log("mapped", doubled.join(","));

function makeCounter(): () => number {
  return () => shared--;
}
let shared = 3;
const c1 = makeCounter();
const c2 = makeCounter();
console.log("shared", c1(), c2(), c1());

let fallback: string | undefined = "kept" as string | undefined;
const pick = (): string => (fallback ??= "replaced");
console.log("fallback", pick());

nextAsync()
  .then((v) => nextAsync().then((w) => console.log("asyncCount", v, w)))
  .catch(() => {});

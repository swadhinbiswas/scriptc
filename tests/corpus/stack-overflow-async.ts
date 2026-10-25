// Recursion inside async functions and generators runs on their own stacks;
// exhausting one throws the catchable RangeError there (or rejects).
function depth(n: number): number {
  return n === 0 ? 0 : 1 + depth(n - 1);
}
function endless(n: number): number {
  return endless(n + 1) + 1;
}

async function guarded(label: string): Promise<string> {
  await null;
  try {
    return String(endless(0));
  } catch (e) {
    return `${label} ${(e as Error).name} ${(e as Error).message}`;
  }
}

async function rejecting(): Promise<number> {
  await null;
  return endless(0);
}

async function bounded(): Promise<number> {
  await null;
  return depth(2000);
}

function* steps(): Generator<number> {
  yield depth(1000);
  try {
    yield endless(0);
  } catch (e) {
    yield (e as Error).name.length;
  }
}

console.log(await guarded("fiber"));
try {
  await rejecting();
} catch (e) {
  console.log("rejected", e instanceof RangeError, (e as Error).message);
}
console.log("bounded", await bounded());
const first = guarded("one");
const second = guarded("two");
console.log(await second, "/", await first);
console.log([...steps()].join(","));
console.log("main", depth(3000));

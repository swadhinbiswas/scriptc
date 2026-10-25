function depth(n: number): number {
  return n === 0 ? 0 : depth(n - 1) + 1;
}

async function inAsync(n: number): Promise<number> {
  await Promise.resolve();
  return depth(n);
}

function* inGenerator(n: number): Generator<number> {
  yield depth(n);
}

for (const n of [1000, 3000]) {
  console.log("async", n, await inAsync(n));
  console.log("generator", n, inGenerator(n).next().value);
}
console.log("top", depth(6000));

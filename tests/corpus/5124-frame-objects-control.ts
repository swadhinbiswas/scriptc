// Number records and objects across try/catch/finally, labeled loops,
// generators and async functions keep the same values and order of
// effects as in Node.
interface Box {
  w: number;
  h: number;
}
function area(b: Box): number {
  return b.w * b.h;
}
function make(w: number, h: number): Box {
  return { w, h };
}
function guarded(n: number): number {
  const b = make(n, n + 1);
  try {
    if (n === 3) throw new Error("three");
    return area(b);
  } catch (error) {
    return -area({ w: (error as Error).message.length, h: 1 });
  } finally {
    console.log("finally", area(b));
  }
}
function* boxes(n: number): Generator<number> {
  for (let i = 0; i < n; i++) {
    const b = make(i, 2);
    yield area(b);
  }
}
async function later(n: number): Promise<number> {
  const b = make(n, 3);
  await null;
  return area(b) + area(make(1, 1));
}

let total = 0;
outer: for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    const b = { w: i, h: j };
    if (area(b) > 6) continue outer;
    total += area(b) + guarded(j);
  }
}
console.log(total, [...boxes(4)].join(","));
later(4).then((value) => console.log("later", value));

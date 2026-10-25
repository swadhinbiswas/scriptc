// Functions whose annotated or inferred return is a record built from
// unchecked element reads return `undefined` in each field a missing
// element leaves empty, as Node does.
interface Pair {
  left: number;
  right: number;
}
function pairAt(values: number[], i: number): Pair {
  return { left: values[i], right: values[i + 1] };
}
function choose(values: number[], i: number, flip: boolean): Pair {
  return flip ? { left: values[i + 1], right: values[i] } : pairAt(values, i);
}
function inferred(values: number[], i: number) {
  return { left: values[i - 1], right: values[i] };
}
function forward(values: number[], i: number): Pair {
  const pair = pairAt(values, i);
  return pair;
}

const values = [3, 1, 4];
for (let i = 0; i < 4; i++) {
  const p = pairAt(values, i);
  const c = choose(values, i, i % 2 === 1);
  const q = inferred(values, i);
  const f = forward(values, i);
  console.log(p.left, p.right, c.left ?? "none", c.right ?? "none", q.left, f.right);
  console.log(JSON.stringify(p), JSON.stringify(q), String(p.right + 1), p.right === undefined);
}

let total = 0;
for (let i = 0; i < 5; i++) {
  const p = pairAt(values, i);
  total += (p.left ?? 0) * 10 + (p.right ?? 0);
}
console.log(total);

// Functions whose results are `number | undefined` and similar unions:
// direct calls, function values, overridden methods, exceptions and
// finally blocks all observe the same values.
function at(values: number[], i: number): number | undefined {
  return values[i];
}
function flagAt(values: boolean[], i: number): boolean | undefined {
  return values[i];
}
function positive(n: number): number | null {
  return n > 0 ? n : null;
}
function three(n: number): number | null | undefined {
  return n > 1 ? n : n === 1 ? null : undefined;
}
function same(value: number | undefined): number | undefined {
  return value;
}
function thrower(n: number): number | undefined {
  if (n === 3) throw new Error(`boom ${n}`);
  return n > 4 ? undefined : n * 2;
}
function guarded(n: number): number | undefined {
  try {
    if (n > 2) return n;
    return undefined;
  } finally {
    console.log("finally", n);
  }
}
function find(values: number[], limit: number): number | undefined {
  for (let i = 0; i < values.length; i++) {
    const value = values[i];
    if (value !== undefined && value > limit) return value;
  }
  return undefined;
}
function last(values: number[], i: number): number | undefined {
  return i < 0 ? undefined : (at(values, i) ?? last(values, i - 1));
}
class Store {
  data: number[] = [4, 5];
  get(i: number): number | undefined {
    return this.data[i];
  }
}
class Override extends Store {
  get(i: number): number | undefined {
    return i === 0 ? 99 : super.get(i);
  }
}

const values = [1, 2, 3];
for (let i = -1; i < 6; i++) {
  console.log(i, at(values, i), at(values, i) ?? "none", at(values, i) === undefined);
  console.log(flagAt([true, false], i), positive(i), three(i), same(at(values, i)));
  try {
    console.log(thrower(i));
  } catch (error) {
    console.log("caught", (error as Error).message);
  }
  console.log(guarded(i), find(values, i), last(values, i + 3));
}

const value: (values: number[], i: number) => number | undefined = at;
console.log(value(values, 1), value(values, 7), [0, 1, 5].map((i) => at(values, i)));
const stores: Store[] = [new Store(), new Override()];
for (const store of stores) console.log(store.get(0), store.get(1), store.get(2));

const kept: (number | undefined)[] = [];
for (let i = 0; i < 4; i++) kept.push(at(values, i));
console.log(kept);
let carried: number | undefined = at(values, 0);
for (let i = 0; i < 5; i++) carried = at(values, i) ?? carried;
console.log(carried);
const record = { missing: at(values, 9), present: at(values, 0) };
console.log(record, JSON.stringify(record));

function sum(a: number[], lo: number, hi: number): number | undefined {
  if (hi - lo <= 1) return a[lo];
  const mid = (lo + hi) >> 1;
  const left = sum(a, lo, mid);
  const right = sum(a, mid, hi);
  if (left === undefined) return right;
  if (right === undefined) return left;
  return left + right;
}
console.log(sum(values, 0, 10), sum([], 0, 4));

function base(a: number[], lo: number, hi: number): number {
  if (hi - lo <= 1) {
    let v = a[lo];
    if (v === undefined) v = 0;
    return v;
  }
  const mid = (lo + hi) >> 1;
  return base(a, lo, mid) + base(a, mid, hi);
}
console.log(base(values, 0, 8));

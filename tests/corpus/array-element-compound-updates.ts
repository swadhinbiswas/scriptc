import { publish } from "@scriptc/threads";

// Compound updates of statically typed array elements: fields, locals and
// parameters. A hole or an index past the end reads undefined, so numeric
// updates store NaN there (extending the array); `??=` stores only into a
// missing element. Published arrays keep their write errors.

const show = (xs: readonly unknown[]): string => {
  const parts: string[] = [];
  for (let i = 0; i < xs.length; i++) parts.push(i in xs ? String(xs[i]) : "<hole>");
  return `[${parts.join(",")}] length ${xs.length}`;
};

class Counters {
  counts: number[] = [0, 0, 0];
  names: string[] = ["a", "b"];
  flags: boolean[] = [true];
  tick(kind: number): number {
    return this.counts[kind]++;
  }
  untick(kind: number): number {
    return --this.counts[kind];
  }
  add(kind: number, amount: number): number {
    return (this.counts[kind] += amount);
  }
  update(kind: number): void {
    this.counts[kind] -= 3;
    this.counts[kind] *= 2;
    this.counts[kind] |= 1;
  }
  fill(kind: number, value: number): number {
    return (this.counts[kind] ??= value);
  }
  suffix(i: number): string {
    return (this.names[i] += "!");
  }
  flag(i: number): boolean {
    return (this.flags[i] ??= false);
  }
}

const counters = new Counters();
for (let i = 0; i < 10; i++) counters.tick(i % 3);
console.log("field ticks", show(counters.counts));
console.log("field post/pre", counters.tick(0), counters.untick(1), show(counters.counts));
console.log("field add", counters.add(2, 2.5), show(counters.counts));
counters.update(0);
console.log("field update", show(counters.counts));
console.log("field past end", counters.tick(4), show(counters.counts));
console.log("field hole read", counters.untick(3), show(counters.counts));
console.log("field fill", counters.fill(0, 99), counters.fill(6, 7), show(counters.counts));
console.log("field strings", counters.suffix(0), counters.suffix(3), show(counters.names));
console.log("field flags", counters.flag(0), counters.flag(2), show(counters.flags));

function locals(): void {
  const xs: number[] = [1, 2, 3];
  xs[0]++;
  xs[1]--;
  ++xs[2];
  xs[0] += 10;
  xs[1] -= 0.5;
  xs[2] *= 3;
  xs[0] |= 4;
  console.log("local", show(xs));
  const sparse: number[] = [1, 2];
  sparse.length = 4;
  const before = sparse[2]++;
  sparse[3] += 1;
  sparse[1] ??= 50;
  sparse[5] ??= 60;
  console.log("local sparse", before, show(sparse));
  const nan: number[] = [NaN];
  nan[0] ??= 5;
  nan[0]++;
  console.log("local NaN", show(nan));
  const value: number[] = [];
  const results = [value[0]++, ++value[1], (value[2] += 1), (value[3] ??= 2), (value[4] |= 7)];
  console.log("local empty", results, show(value));
  let index = 0;
  const order: number[] = [5, 6];
  order[index++] += order[index++] * 10;
  console.log("local order", index, show(order));
  const keyed: number[] = [1];
  keyed[-1]++;
  keyed[1.5] += 2;
  console.log("local keys", show(keyed), keyed[-1], keyed[1.5]);
}
locals();

function params(xs: number[], i: number, amount: number): number {
  xs[i]++;
  xs[i] -= amount;
  xs[i] *= 2;
  xs[i] |= 0;
  return (xs[i] ??= -1);
}
const ps: number[] = [10, 20];
console.log("param", params(ps, 0, 3), params(ps, 1, 0.5), params(ps, 3, 1), show(ps));
const loop: number[] = [0, 0, 0, 0];
for (let i = 0; i < 1000; i++) loop[i & 3] += i;
for (let i = 0; i < 1000; i++) loop[i % 4]++;
console.log("param loop", show(loop));

const shared = publish([1, 2, 3]);
const attempts: [string, () => unknown][] = [
  ["++", () => shared[0]++],
  ["--", () => --shared[1]],
  ["+=", () => (shared[2] += 1)],
  ["*= past end", () => (shared[5] *= 2)],
  ["|=", () => (shared[0] |= 8)],
  ["??= past end", () => (shared[4] ??= 3)],
  ["??= present", () => (shared[0] ??= 3)],
];
for (const [label, attempt] of attempts) {
  try {
    console.log("published", label, attempt());
  } catch (e) {
    console.log("published", label, (e as Error).name);
  }
}
console.log("published after", show(shared));

// Other element types keep their own update rules.
const big: bigint[] = [1n, 2n];
big[0]++;
--big[1];
console.log("bigint", big);
const optional: (number | undefined)[] = [1, undefined];
optional[0] ??= 5;
optional[1] ??= 6;
optional[3] ??= 7;
console.log("optional", show(optional));
const strs: string[] = ["a"];
strs[0] ||= "z";
strs[2] ||= "q";
strs[0] += 1;
console.log("strings", show(strs));
const nums: number[] = [0, 3];
const logical = [(nums[0] ||= 9), (nums[1] ||= 9), (nums[4] ||= 2), (nums[1] &&= 4), (nums[7] &&= 4)];
console.log("logical", logical, show(nums));
const nested: number[][] = [[1], [2]];
nested[1][0] -= 1;
nested[0][3] += 1;
console.log("nested", show(nested[0]), show(nested[1]));

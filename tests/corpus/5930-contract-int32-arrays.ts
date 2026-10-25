// Int32[] contracts (@scriptc/types): every element stored into an array
// that can reach an Int32[] slot is an int32 by construction, so element
// reads that find a value are int32s and integer kernels over them run in
// 32-bit arithmetic. Holes, missing indices and length changes keep their
// JavaScript behavior. `import type` is erased: Node never loads the
// package.
import type { Int32 } from "@scriptc/types";

function lcg(n: number, seed: number): Int32[] {
  const out: Int32[] = [];
  let x = seed | 0;
  for (let i = 0; i < n; i++) {
    x = (Math.imul(x, 1103515245) + 12345) | 0;
    out.push(x >> 8);
  }
  return out;
}

function sum(a: Int32[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s = (s + a[i]) | 0;
  return s;
}

function hash(a: readonly Int32[]): number {
  let h = 17;
  for (let i = 0; i < a.length; i++) h = (Math.imul(h, 31) + a[i]) | 0;
  return h;
}

function xorAll(a: Array<Int32>): number {
  let h = 0;
  for (let i = 0; i < a.length; i++) h ^= a[i];
  return h;
}

function dot(a: Int32[], b: Int32[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s = (s + Math.imul(a[i], b[i])) | 0;
  return s;
}

function prefix(a: Int32[], out: Int32[]): void {
  let run = 0;
  for (let i = 0; i < a.length; i++) {
    run = (run + a[i]) | 0;
    out[i] = run;
  }
}

function gather(table: Int32[], idx: Int32[], out: Int32[]): void {
  for (let i = 0; i < idx.length; i++) out[i] = table[idx[i]];
}

function histogram(keys: Int32[], buckets: number): Int32[] {
  const counts: Int32[] = new Array<number>(buckets).fill(0);
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i] & (buckets - 1);
    counts[k] = (counts[k] + 1) | 0;
  }
  return counts;
}

function forOfSum(a: Int32[]): number {
  let s = 0;
  for (const x of a) s = (s + x) | 0;
  return s;
}

class Grid {
  readonly width: number;
  cells: Int32[];
  constructor(width: number, height: number) {
    this.width = width;
    this.cells = new Array<number>(width * height).fill(0);
  }
  set(x: number, y: number, v: number): void {
    this.cells[y * this.width + x] = v | 0;
  }
  rowSum(y: number): number {
    let s = 0;
    for (let x = 0; x < this.width; x++) s = (s + this.cells[y * this.width + x]) | 0;
    return s;
  }
}

interface Mesh {
  name: string;
  indices: number[];
}

function meshChecksum(m: Mesh): number {
  let h = 0;
  for (let i = 0; i < m.indices.length; i++) h = (Math.imul(h, 33) ^ m.indices[i]) | 0;
  return h;
}

const big = lcg(4096, 7);
const other = lcg(4096, 11);
console.log("sum", sum(big), "hash", hash(big), "xor", xorAll(big), "dot", dot(big, other));
console.log("for-of", forOfSum(big) === sum(big));

// Values at the int32 edges stay exact.
const edges: Int32[] = [2147483647, -2147483648, 0, -1, 1];
console.log("edges", sum(edges), hash(edges), edges[0] + edges[0], edges[1] - 1);

const pre: Int32[] = [];
pre.length = big.length;
prefix(big, pre);
console.log("prefix", pre[0], pre[100], pre[pre.length - 1], pre.length);

const idx: Int32[] = [];
for (let i = 0; i < 16; i++) idx.push((i * 7) & 15);
const table: Int32[] = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
const picked: Int32[] = [];
gather(table, idx, picked);
console.log("gather", picked.join(","));

const counts = histogram(big, 8);
console.log("histogram", counts.join(","), sum(counts));

// Holes, present undefined and missing indices read as in JavaScript:
// undefined, and NaN in arithmetic, which ToInt32 turns into 0.
const holey: Int32[] = [1, 2, 3];
holey[6] = 7;
console.log("holey", holey.length, holey[4], holey[4] === undefined, sum(holey), hash(holey));
console.log("missing", holey[100], (holey[100] + 1) | 0, holey[-1], 4 in holey, 6 in holey);
console.log("search", holey.indexOf(3), holey.includes(7), holey.includes(5));
holey.length = 2;
console.log("truncated", holey.length, holey[0], holey[1], sum(holey));

// Mutating methods, copies and spreads.
const work: Int32[] = [5, -3, 9, 0, 12];
const more = [8, 1];
work.unshift(4, 4);
work.push(...more);
work.splice(2, 1, 100, 101);
work.sort((x, y) => x - y);
work.reverse();
work.fill(-7, 0, 1);
const copy: Int32[] = work.slice(1, 4);
const joined: Int32[] = [...copy, ...work, 3];
const concatenated: Int32[] = copy.concat(joined);
console.log("work", work.join(" "), "|", copy.join(" "), "|", joined.length, concatenated.length);
console.log("popped", work.pop(), work.shift(), work.length, sum(work), Math.max(...work), Math.min(...copy));

// Fields, records, closures and maps carry the facts along.
const grid = new Grid(4, 3);
for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) grid.set(x, y, x * 10 + y);
console.log("grid", grid.rowSum(0), grid.rowSum(2), grid.cells.length);

const mesh: Mesh = { name: "tri", indices: [0, 1, 2, 2, 1, 3] };
const meshIndices: Int32[] = mesh.indices;
meshIndices.push(3);
console.log("mesh", mesh.name, meshChecksum(mesh), mesh.indices.length);

const byName = new Map<string, number[]>();
const tracked: Int32[] = [1, 2, 3];
byName.set("t", tracked);
byName.get("t")!.push(4);
let captured = 0;
const addAll = (): void => {
  for (let i = 0; i < tracked.length; i++) captured = (captured + tracked[i]) | 0;
};
addAll();
console.log("map", tracked.join(","), captured, byName.get("t")!.length);

// Library helpers shared with ordinary number arrays: sorting moves the
// array's own elements, filtering keeps them.
const prices = [2.5, 1.25, 9.75];
const ranks: Int32[] = [5, 3, 9, 1];
ranks.sort((x, y) => x - y);
prices.sort((x, y) => x - y);
const high: Int32[] = ranks.filter((x) => x > 2);
console.log("shared", ranks.join(","), prices.join(","), high.join(","), prices.filter((x) => x > 2).length);

console.log(edges, JSON.stringify(copy));

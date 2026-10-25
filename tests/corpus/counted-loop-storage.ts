function store(values: Uint32Array, count: number): number {
  let sum = 0;
  for (let i = 0; i < count; i++) {
    values[i] = Math.imul(i, 17);
    sum ^= values[i];
  }
  return sum;
}
const values = new Uint32Array(7);
console.log("store", store(values, 6.5), Array.from(values).join(","));
function scan(values: Uint32Array, last: number): number {
  let sum = 0;
  for (let i = 0; i <= last; i++) {
    if (i % 3 === 1) continue;
    sum += values[i];
  }
  return sum;
}
console.log("scan", scan(values, 6), scan(values, -0.5));
for (let i = 4294967296; i < 4294967298; i++) values[i] = 99;
console.log("wide-index", values[0], values[1]);

function replace(count: number): string {
  let first = new Uint32Array([1, 2, 3]);
  const saved = first;
  const second = new Uint32Array([7, 8, 9]);
  for (let i = 0; i < count; i++) first[i] = (first = second, i + 10);
  return `${Array.from(saved).join(",")}/${Array.from(second).join(",")}`;
}
console.log("receiver", replace(3));

function escaped(limit: number): string {
  let out = "";
  try {
    for (let i = 0; i <= limit; i++) {
      try {
        if (i === 2) throw new Error("stop");
        if (i === 0) continue;
        out += `${i >>> 0},`;
      } finally {
        out += `f${i},`;
      }
    }
  } catch (error) {
    out += (error as Error).message;
  }
  return out;
}
console.log("cleanup", escaped(4), escaped(Infinity));
function nested(limit: number): number {
  let sum = 0;
  outer: for (let round = 0; round < 3; round++) {
    for (let i = 0; i < limit; i++) {
      if (i === 2) continue outer;
      sum += i >>> 0;
    }
  }
  return sum;
}
console.log("labels", nested(4), nested(Infinity));
const closures: (() => number)[] = [];
for (let i = 0; i < 3; i++) closures.push(() => i >>> 0);
console.log("closures", closures.map((f) => f()).join(","));

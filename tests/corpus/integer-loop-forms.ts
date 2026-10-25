function steps(limit: number): string {
  let out = "";
  for (let i = -3; limit > i; i += 2) {
    out += `${i}:${i | 0},`;
    if (i >= 5) break;
  }
  out += "/";
  for (let i = 5; limit <= i; i -= 3) {
    out += `${i}:${i | 0},`;
    if (i <= -4) break;
  }
  return out;
}
for (const limit of [NaN, Infinity, -Infinity, -0, -1.5, 0.5, 5]) console.log("steps", limit, steps(limit));
function reverse(values: Uint32Array): string {
  const length = values.length;
  let out = "";
  for (let i = length - 1; i >= 0; i--) {
    if (i % 3 === 1) continue;
    out += `${i}:${values[i]},`;
  }
  return out;
}
console.log("reverse", reverse(new Uint32Array(0)), reverse(new Uint32Array([3, 5, 7, 11, 13])));
function boundary(limit: number): string {
  let out = "";
  let count = 0;
  for (let i = 9007199254740990; i <= limit; i += 3) {
    out += `${i}:${i >>> 0},`;
    if (++count === 3) break;
  }
  out += "/";
  count = 0;
  for (let i = -9007199254740990; i >= -limit; i -= 3) {
    out += `${i}:${i >>> 0},`;
    if (++count === 3) break;
  }
  return out;
}
console.log("boundary", boundary(9007199254740991), boundary(Infinity));
function fractional(step: number): string {
  let out = "";
  for (let i = 0.5; i < 3; i += step) out += `${i}:${i >>> 0},`;
  return out;
}
console.log("fractional", fractional(0.5));
function zeroEnd(limit: number): string {
  let out = "";
  for (let i = -1; i <= limit; i++) out += `${1 / i}:${i | 0},`;
  for (let i = 1; i >= limit; i--) out += `${1 / i}:${i | 0},`;
  return out;
}
console.log("zero-end", zeroEnd(-0), zeroEnd(0.5));

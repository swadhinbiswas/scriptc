// `??`, `||` and conditional chains over optional element reads choose
// the first present (or truthy) value without changing evaluation order.
const numbers = [5, 0, NaN, -1];
for (let i = 0; i < 6; i++) {
  const a = numbers[i] ?? numbers[i - 2] ?? 0;
  let b = numbers[i + 3] ?? numbers[i];
  b = numbers[i + 7] ?? b;
  console.log(a, b, numbers[i] || 11, numbers[i + 1] || numbers[i] || 12);
}

let calls = 0;
function index(i: number): number {
  calls++;
  return i;
}
console.log(numbers[index(0)] ?? numbers[index(1)], calls);
console.log(numbers[index(9)] ?? numbers[index(1)], calls);

function pick(values: number[], i: number): number {
  return values[i] ?? values[values.length - 1] ?? NaN;
}
console.log(pick([], 0), pick([4], 3), pick([4, 8], 0));

let best: number | undefined;
for (const i of [3, 0, 2, 9, 1]) {
  const candidate = numbers[i];
  best = candidate !== undefined && (best === undefined || candidate > best) ? candidate : best;
}
console.log(best);

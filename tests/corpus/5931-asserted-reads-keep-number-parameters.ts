// Arguments asserted to a type without undefined (`xs[i] as number`,
// `stack.pop() as number`, `map.get(k) as Item`) pass present values.
// A callee that also receives an unchecked missing read still observes
// undefined there.
class Item {
  weight: number;
  constructor(weight: number) {
    this.weight = weight;
  }
}

function hot(n: number): number {
  return (n * 2) | 0;
}

function describe(n: number): string {
  return n === undefined ? "missing" : `value ${n}`;
}

function weigh(item: Item): number {
  return item.weight;
}

function cold(xs: number[]): number {
  let s = 0;
  for (let i = 0; i < xs.length; i++) s = (s + hot(xs[i] as number)) | 0;
  return s;
}

function drain(stack: number[]): number {
  let s = 0;
  while (stack.length > 0) s = (s + hot(stack.pop() as number)) | 0;
  return s;
}

function total(items: Map<string, Item>, keys: string[]): number {
  let sum = 0;
  for (const key of keys) if (items.has(key)) sum += weigh(items.get(key) as Item);
  return sum;
}

const xs = [1, 2, 3];
console.log(cold(xs), drain([4, 5, 6]));
console.log(describe(xs[1] as number), describe(xs[7]));
const items = new Map([
  ["a", new Item(10)],
  ["b", new Item(20)],
]);
console.log(total(items, ["a", "b", "c"]));
let t = 0;
for (let i = 0; i < 1000; i++) t = (t + hot(i)) | 0;
console.log(t);

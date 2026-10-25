// Arrays built by literals, slice and concat, then grown by push, unshift,
// splice, indexed writes past the end and length changes, for every
// element kind: numbers, booleans, strings, nested arrays and class
// instances. Holes, present undefined values, sparse indices and arrays
// that grow past the dense cutoff keep their contents.

class Point {
  readonly x: number;
  readonly y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

function describe(label: string, values: unknown[]): void {
  const parts: string[] = [];
  for (let i = 0; i < values.length; i++) {
    if (!(i in values)) parts.push("<hole>");
    else {
      const v = values[i];
      parts.push(v instanceof Point ? `P(${v.x},${v.y})` : JSON.stringify(v) ?? "undefined");
    }
  }
  console.log(label, values.length, parts.join(" "));
}

for (let n = 0; n <= 7; n++) {
  const numbers: number[] = [];
  for (let i = 0; i < n; i++) numbers.push(i * 1.5);
  const copy = numbers.slice();
  copy.push(100);
  copy.push(101);
  const joined = copy.concat(numbers);
  joined.unshift(-1);
  describe(`numbers ${n}`, joined);

  const flags: boolean[] = [];
  for (let i = 0; i < n; i++) flags.push(i % 2 === 0);
  const flagCopy = flags.slice();
  flagCopy.push(true);
  describe(`flags ${n}`, flagCopy.concat(flags));

  const words = numbers.map((v) => `w${v}`);
  const wordCopy = words.slice(0);
  wordCopy.push("tail");
  wordCopy.splice(1, 0, "inserted", "again");
  describe(`words ${n}`, wordCopy);

  const points = numbers.map((v, i) => new Point(v, i));
  const pointCopy = points.slice();
  pointCopy.push(new Point(-1, -1));
  const morePoints = pointCopy.concat(points, [new Point(9, 9)]);
  morePoints.pop();
  describe(`points ${n}`, morePoints);

  const nested: number[][] = [numbers, numbers.slice(1)];
  const nestedCopy = nested.slice();
  nestedCopy.push([n]);
  describe(`nested ${n}`, nestedCopy);
}

// Literals of every small length, then one append each.
const literals: number[][] = [[], [1], [1, 2], [1, 2, 3], [1, 2, 3, 4], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5, 6]];
for (const literal of literals) {
  const grown = literal.slice();
  grown.push(literal.length * 10);
  grown.push(literal.length * 10 + 1);
  describe(`literal ${literal.length}`, grown);
}

// Holes and present undefined values survive growth.
const holes: (number | undefined)[] = [1, undefined, 3];
const holeCopy = holes.slice();
holeCopy[6] = 7;
holeCopy.push(8);
describe("holes", holeCopy);
const shrunk = holeCopy.concat([9]);
shrunk.length = 4;
shrunk.push(10);
describe("shrunk", shrunk);

// A far index stays sparse; filling up to it makes the array dense again.
const sparse = [1, 2].slice();
sparse[3000000] = 3;
sparse.push(4);
console.log("sparse", sparse.length, sparse[0], sparse[1], sparse[2], sparse[3000000], sparse[3000001]);
const dense = [0].slice();
for (let i = 1; i < 1100000; i++) dense.push(i);
let total = 0;
for (const v of dense) total += v;
console.log("dense", dense.length, total, dense[1048575], dense[1048576], dense[1099999]);

// Stacks that shrink with length assignments and pops, then grow again.
const stack: Point[] = [];
let sum = 0;
for (let round = 0; round < 5000; round++) {
  const pair = [new Point(round, 1), new Point(round, 2)];
  const copy = pair.slice();
  copy.push(new Point(round, 3));
  const joined = copy.concat(pair);
  sum += joined.length + joined[4]!.y;
  stack.push(joined[0]!);
  if (stack.length > 32) stack.length = 16;
  else if ((round & 3) === 0) stack.pop();
}
console.log("stack", sum, stack.length, stack[0]!.x, stack[stack.length - 1]!.x);

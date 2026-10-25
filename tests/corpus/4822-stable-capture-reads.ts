// Closures read captured parameters that nothing rebinds straight from
// their environment, including through nested closures and after the
// creating call returned. A parameter that some closure rebinds keeps an
// owned snapshot for each read, so replacing it mid-iteration is safe.
function counter(keys: string[]): (word: string) => number {
  return (word) => {
    let n = 0;
    for (const key of keys) if (key === word || key.startsWith(word)) n++;
    return n;
  };
}

function nested(rows: number[][], scale: number): () => () => number {
  return () => () => {
    let total = 0;
    for (const row of rows) for (const v of row) total += v * scale;
    return total;
  };
}

function resettable(keys: string[]): { count: () => number; reset: () => void } {
  const reset = (): void => {
    keys = ["after"];
  };
  const count = (): number => {
    let n = 0;
    for (const key of keys) {
      reset();
      n += key.length;
    }
    return n + keys.length;
  };
  return { count, reset };
}

function pairs(names: string[], values: number[]): (i: number) => string {
  const pick = (i: number): string => names[i % names.length]! + "=" + values[i % values.length]!;
  return (i) => pick(i) + "," + pick(i + 1);
}

function sumBy(items: { w: number }[]): (bias: number) => number {
  return (bias) => items.reduce((acc, item) => acc + item.w + bias, 0);
}

let words: string[] | null = ["alpha", "alps", "beta", "alpine", "gamma"].map((w) => w + "");
const count = counter(words);
words = null;
console.log("counter", count("alp"), count("beta"), count("x"), words);

let grid: number[][] | null = [
  [1, 2, 3],
  [4, 5],
  [6],
];
const outer = nested(grid, 10);
grid = null;
const inner = outer();
console.log("nested", inner(), outer()(), grid);

const r = resettable(["one", "three", "five"]);
console.log("resettable", r.count(), r.count());

const p = pairs(["a", "b", "c"], [1, 2]);
console.log("pairs", p(0), p(4));

const s = sumBy([{ w: 1 }, { w: 2 }, { w: 3 }]);
console.log("sumBy", s(0), s(10));

// Many closures over one parameter, created in a loop.
function family(base: string[]): (() => string)[] {
  const out: (() => string)[] = [];
  for (let i = 0; i < 3; i++) out.push(() => base.join("-") + i);
  return out;
}
console.log("family", family(["x", "y"].map((v) => v + v)).map((f) => f()).join(" "));

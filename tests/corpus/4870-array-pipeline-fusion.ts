// Chains of array callbacks (filter/map/flatMap/slice feeding reduce, some,
// every, findIndex, forEach, length or a final array) keep JavaScript's
// stage-by-stage semantics: callback order, holes, sparse arrays,
// exceptions part-way through, early exits and slice bounds.

interface Item {
  id: number;
  group: string;
  weight: number;
}

const items: Item[] = [];
for (let i = 0; i < 40; i++) {
  items.push({ id: i, group: i % 3 === 0 ? "a" : i % 3 === 1 ? "b" : "c", weight: (i * 7) % 11 });
}

// Pure chains.
const heavy = items
  .filter((it) => it.weight > 4)
  .map((it) => ({ id: it.id, score: it.weight * 2 }))
  .filter((s) => s.score % 3 !== 0);
console.log("heavy", heavy.length, heavy.reduce((sum, s) => sum + s.score, 0));
console.log(
  "sum",
  items.filter((it) => it.group === "b").map((it) => it.weight).reduce((a, b) => a + b, 0),
);
console.log("some", items.map((it) => it.weight).some((w) => w === 10));
console.log("every", items.filter((it) => it.group !== "a").every((it) => it.id % 3 !== 0));
console.log("findIndex", items.filter((it) => it.group === "c").findIndex((it) => it.weight === 0));
console.log("findIndex miss", items.filter((it) => it.group === "c").findIndex((it) => it.weight > 99));
console.log("length", items.filter((it) => it.weight < 3).length);
console.log("map length", items.map((it) => it.id * 2).length);
console.log(
  "flatMap length",
  items.slice(0, 12).flatMap((it) => (it.group === "a" ? [it.id, it.weight] : [])).length,
);
console.log(
  "collect",
  items
    .filter((it) => it.weight === 3)
    .map((it) => `${it.group}${it.id}`)
    .join(","),
);
let forEachTotal = 0;
items.filter((it) => it.group === "a").forEach((it) => {
  forEachTotal += it.weight;
});
console.log("forEach", forEachTotal);
const pairs = items.slice(5, 15).flatMap((it) => [it.id, -it.id]);
console.log("pairs", pairs.length, pairs.slice(0, 4).join(","));
const centroid = items
  .slice(0, 20)
  .map((it) => ({ x: it.id / 2, y: it.weight }))
  .reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
console.log("centroid", centroid.x, centroid.y);

// A const read once by the next statement's consumer.
const picked = items.filter((it) => it.weight % 2 === 1);
const pickedSum = picked.reduce((acc, it) => acc + it.id, 0);
console.log("picked", pickedSum);
const firstMapped = items.map((it) => it.weight + 1);
console.log("firstMapped", firstMapped.filter((w) => w > 5).length);
// Read twice: it stays an array.
const twice = items.filter((it) => it.id < 5);
console.log("twice", twice.length, twice.map((it) => it.id).join(""));

// Slice bounds: negative, NaN, past the end, reversed.
const nums = [5, 1, 4, 2, 8, 7];
console.log("slice -3", nums.slice(-3).map((n) => n * 10).join(","));
console.log("slice NaN", nums.slice(NaN, 2).map((n) => n + 1).join(","));
console.log("slice past", nums.slice(4, 100).reduce((a, n) => a + n, 0));
console.log("slice reversed", nums.slice(4, 2).map((n) => n).length);
console.log("slice fraction", nums.slice(1.7, -1.2).filter((n) => n > 1).join(","));
console.log("slice -inf", nums.slice(-Infinity, Infinity).filter((n) => n % 2 === 0).length);

// Holes: map and slice keep them, filter and flatMap drop them; findIndex
// visits them as undefined.
const holes: number[] = [];
holes[0] = 1;
holes[2] = 3;
holes[3] = 4;
holes[5] = 6;
function keys(xs: number[]): string {
  const out: number[] = [];
  xs.forEach((_, i) => {
    out.push(i);
  });
  return out.join(",");
}
console.log("holes map length", holes.map((n) => n * 2).length);
console.log("holes map reduce", holes.map((n) => n * 2).reduce((a, n) => a + n, 0));
console.log("holes map filter", holes.map((n) => n * 2).filter((n) => n > 2).join(","));
console.log("holes map keys", keys(holes.map((n) => n + 1).map((n) => n * 3)));
console.log("holes slice keys", keys(holes.slice(1).map((n) => n)));
console.log("holes map every", holes.map((n) => n > 0).every((b) => b));
const visited: string[] = [];
const hit = holes.map((n) => n).findIndex((n) => {
  visited.push(String(n));
  return n === undefined;
});
console.log("holes findIndex", hit, visited.join(","));
const sparse: number[] = [];
sparse[3] = 30;
sparse[10] = 100;
console.log("sparse", sparse.map((n) => n / 10).filter((n) => n > 1).join(","), sparse.map((n) => n).length);

// Explicit undefined elements reach the callbacks.
const maybe: (number | undefined)[] = [1, undefined, 3];
console.log(
  "maybe",
  maybe.map((n) => (n === undefined ? -1 : n * 2)).filter((n) => n !== 3).join(","),
);
console.log("maybe filter", maybe.filter((n) => n !== 1).map((n) => String(n)).join("/"));

// Callback order is observable: these keep stage-by-stage order.
const log: string[] = [];
const ordered = [1, 2, 3]
  .map((n) => {
    log.push(`m${n}`);
    return n * 2;
  })
  .filter((n) => {
    log.push(`f${n}`);
    return n > 2;
  });
console.log("ordered", ordered.join(","), log.join(" "));

let seen = 0;
const counted = [1, 2, 3, 4]
  .map((n) => {
    seen++;
    return n;
  })
  .filter((n) => n <= seen);
console.log("counted", counted.join(","), seen);

// An exception part-way through a later stage: earlier stages completed.
let mapped = 0;
try {
  [1, 2, 3, 4]
    .map((n) => {
      mapped++;
      return n;
    })
    .filter((n) => {
      if (n === 2) throw new Error("stop at " + n);
      return true;
    });
} catch (e) {
  console.log("caught", (e as Error).message, "mapped", mapped);
}

// An exception in the first stage: the terminal never ran.
let consumed = 0;
try {
  [1, 2, 3, 4]
    .map((n) => {
      if (n === 3) throw new Error("bad " + n);
      return n;
    })
    .forEach((n) => {
      consumed += n;
    });
} catch (e) {
  console.log("caught", (e as Error).message, "consumed", consumed);
}

// Early exit does not skip an exception the first stage would raise.
try {
  const found = [1, 2, 3].map((n) => {
    if (n === 3) throw new Error("late " + n);
    return n;
  }).some((n) => n === 1);
  console.log("found", found);
} catch (e) {
  console.log("caught", (e as Error).message);
}

// Index and array parameters.
console.log(
  "indexed",
  [10, 20, 30, 40].filter((n, i) => i !== 1).map((n) => n + 1).join(","),
  [3, 1, 2].map((n) => n * 2).filter((n, i, arr) => arr.length === 3 && i > 0).join(","),
);

console.log(
  "positions",
  [5, 6, 7, 8, 9].filter((n) => n % 2 === 1).map((n, i) => n * 10 + i).join(","),
  [5, 6, 7].map((n) => n + 1).map((n, i) => `${i}:${n}`).join(","),
  [1, 2, 3, 4, 5, 6].slice(2).map((n, i) => n - i).join(","),
  [1, 2, 3, 4, 5].filter((n) => n !== 3).reduce((acc, n, i) => acc + n * i, 0),
  keys(holes.map((n) => n).map((n, i) => i)),
  holes.map((n) => n * 2).filter((n, i) => i > 2).join(","),
  [9, 8, 7, 6].map((n, i, arr) => n + i + arr.length).filter((n) => n > 12).length,
);
const positions: string[] = [];
[4, 5, 6, 7].filter((n) => n > 4).forEach((n, i) => {
  positions.push(`${i}=${n}`);
});
console.log("forEach positions", positions.join(" "));

// Callbacks that mutate the source keep the unfused semantics.
const grow = [1, 2, 3];
const grown = grow
  .map((n) => {
    if (n === 1) grow.push(9);
    return n;
  })
  .filter((n) => n > 0);
console.log("grow", grown.join(","), grow.length);

// Boolean filters and string elements.
const words = ["alpha", "", "beta", "", "gamma"];
console.log("words", words.filter(Boolean).map((w) => w.toUpperCase()).join("-"));
console.log("chars", words.map((w) => w.length).filter((n) => n > 0).reduce((a, n) => a * n, 1));

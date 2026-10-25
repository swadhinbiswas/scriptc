import { publish } from "@scriptc/threads";

// Sparse arrays and undefined elements take the compacting path; frozen
// and published arrays keep their write errors, and toSorted copies them.

function show(values: (number | undefined)[]): string {
  const out: string[] = [];
  for (let i = 0; i < values.length; i++) out.push(i in values ? String(values[i]) : "_");
  return values.length + ":" + out.join(",");
}

// Present indices of a number[] whose tail may hold undefined.
function present(values: number[]): string {
  const out: string[] = [];
  for (let i = 0; i < values.length; i++) out.push(i in values ? "v" : "_");
  return values.length + ":" + values.join(",") + ":" + out.join("");
}

const holes: number[] = [5, 3, 8];
holes[6] = 1;
holes[4] = 9;
console.log("holes toSorted", present(holes.toSorted((a, b) => a - b)), present(holes));
holes.sort((a, b) => b - a);
console.log("holes sort", present(holes));

const maybe: (number | undefined)[] = [4, undefined, 2, undefined, 7, 1];
maybe[8] = 3;
console.log("undefined toSorted", show(maybe.toSorted((a, b) => (a ?? 0) - (b ?? 0))));
maybe.sort((a, b) => (a ?? 0) - (b ?? 0));
console.log("undefined sort", show(maybe));

const grown: number[] = [3, 1, 2];
grown.length = 5;
grown.sort((a, b) => a - b);
console.log("length grown", present(grown));

const frozen = Object.freeze([3, 1, 2]);
console.log("frozen toSorted", frozen.toSorted((a, b) => a - b).join(","), frozen.join(","));

const shared = publish([4, 2, 3, 1]);
console.log("published toSorted", shared.toSorted((a, b) => a - b).join(","));
let calls = 0;
try {
  shared.sort((a, b) => {
    calls++;
    return a - b;
  });
} catch (e) {
  console.log("published sort", calls > 0, (e as Error).name, (e as Error).message);
}
console.log("published after", shared.join(","));

const late = [9, 7, 8, 6];
let publishedLate = false;
try {
  late.sort((a, b) => {
    if (!publishedLate) {
      publishedLate = true;
      publish(late);
    }
    return a - b;
  });
} catch (e) {
  console.log("published mid-sort", (e as Error).name, (e as Error).message);
}
console.log("late after", late.join(","));

class Box {
  n: number;
  constructor(n: number) {
    this.n = n;
  }
}
const boxes = publish([new Box(3), new Box(1), new Box(2)]);
console.log(
  "published objects toSorted",
  boxes
    .toSorted((a, b) => a.n - b.n)
    .map((b) => b.n)
    .join(","),
);
try {
  boxes.sort((a, b) => a.n - b.n);
} catch (e) {
  console.log("published objects sort", (e as Error).message);
}

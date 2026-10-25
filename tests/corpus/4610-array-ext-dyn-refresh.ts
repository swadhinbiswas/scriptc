// Sparse slots, noncanonical numeric properties and regex match metadata
// live in an array's out-of-line storage: they keep their values through
// typed views of dynamically typed arrays, writes through live references,
// truncation and copies.

function asNumbers(value: any): number[] {
  return value as number[];
}

const parsed: any = JSON.parse("[1, 2, 3]");
const first = asNumbers(parsed);
console.log("first", first.length, first[0], first[2]);

parsed[-1] = 9;
parsed["1.5"] = 11;
parsed.push(4);
const second = asNumbers(parsed);
console.log("properties", second.length, second[3], parsed[-1], parsed["1.5"], "-1" in parsed, Object.keys(parsed).length);

delete parsed[-1];
parsed.push(5);
const third = asNumbers(parsed);
console.log("third", third.length, third[4], parsed[-1], "-1" in parsed, "1.5" in parsed);

const sparse: number[] = [1, 2, 3];
sparse[4_000_000] = 7;
console.log("sparse", sparse.length, sparse[4_000_000], 3_999_999 in sparse, 4_000_000 in sparse);
sparse.length = 3;
console.log("sparse truncated", sparse.length, sparse[4_000_000], 4_000_000 in sparse);

const typed: number[] = [5, 6];
typed[3_000_000] = 1;
const viaAny: any = typed;
viaAny[3_000_001] = 2;
console.log("typed", typed.length, typed[3_000_000], typed[3_000_001], 3_000_001 in typed);
typed.length = 2;
console.log("typed truncated", typed.length, typed[3_000_000], viaAny.length);

const match = /(b)(c)?/.exec("abd")!;
console.log("match", match.index, match.input, match.length, match[1], match[2]);
const loose: any = match;
console.log("match via any", loose.index, loose.input, loose[1], loose.length);
const copy = match.slice();
console.log("copy", copy.length, copy[0], copy[1]);

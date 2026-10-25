// Set composition methods with Map arguments: the Map's set record reads its
// keys, so every method walks and tests the Map's keys. Node.js prints the same.
const a = new Set([1, 2, 3]);
const m = new Map<number, string>([[3, "c"], [1, "x"], [7, "y"]]);
const show = (s: Set<number>): string => [...s].join(",");
console.log(show(a.union(m)), show(a.intersection(m)), show(a.difference(m)), show(a.symmetricDifference(m)));
console.log(a.isSubsetOf(m), a.isSupersetOf(m), a.isDisjointFrom(m));
const small = new Map<number, boolean>([[2, true]]);
console.log(show(a.intersection(small)), a.isSupersetOf(small), new Set([2]).isSubsetOf(small));
const words = new Set(["a", "b"]);
const counts = new Map<string, number>([["b", 1], ["c", 2]]);
console.log([...words.union(counts)].join(","), [...words.intersection(counts)].join(","), words.isDisjointFrom(counts));
const empty = new Map<number, number>();
console.log(show(a.union(empty)), show(a.difference(empty)), a.isSubsetOf(empty), new Set<number>().isSubsetOf(empty));

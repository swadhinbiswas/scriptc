// Object.groupBy and Map.groupBy in JavaScript: unannotated callback
// parameters take the element and index.
const m = Map.groupBy([1, 2, 3, 4], (n) => n % 2 === 0);
console.log(m.get(true)?.join(","), m.get(false)?.join(","), [...m.keys()].join(","));
console.log(JSON.stringify(Object.groupBy(["aa", "b", "cc"], (s, i) => s.length + i)));
console.log(JSON.stringify(Object.groupBy(new Set(["x", "yy"]), (s) => s.length)));

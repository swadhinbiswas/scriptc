// Set iteration after deletes from the front and the middle: for-of,
// a breaking for-of, values().next(), forEach and spread see the live
// elements in insertion order, including elements re-added later.
const s = new Set<string>();
for (let i = 0; i < 50; i++) s.add("e" + i);
for (let i = 0; i < 45; i++) if (i % 9 !== 4) s.delete("e" + i);
console.log(s.size, [...s].join(","));

let head = "";
for (const e of s) {
  head = e;
  break;
}
console.log("head", head, s.values().next().value, s.keys().next().value);

const viaForEach: string[] = [];
s.forEach((value, key) => viaForEach.push(value === key ? value : "?"));
console.log(viaForEach.join(","));

s.delete("e4");
s.add("e0");
console.log([...s].join(","));
for (const e of s) {
  if (e === "e13") s.delete("e22");
  if (e === "e46") s.add("tail");
  process.stdout.write(e + " ");
}
console.log();

const nums = new Set<number>();
for (let i = 0; i < 100; i++) nums.add(i * 3);
for (let i = 0; i < 99; i++) nums.delete(i * 3);
console.log(nums.size, [...nums].join(","), nums.values().next().value);
nums.delete(297);
console.log(nums.size, nums.values().next().done, [...nums].length);

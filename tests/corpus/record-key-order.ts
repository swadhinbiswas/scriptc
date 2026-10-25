const record: Record<string, number> = {};
for (let i = 96; i >= 0; i--) record[String(i)] = i;
for (const key of ["word", "01", "4294967295", "4294967294", "-0", "", "a\0b", "é😀"]) record[key] = 100;
console.log(Object.keys(record).join("|"));
console.log(Object.values(record).join("|"));
console.log(Object.entries(record).map(([key, value]) => key + ":" + value).join("|"));
const map = new Map<string, number>();
for (let length = 0; length <= 40; length++) {
  const prefix = "same-prefix-".repeat(length);
  for (const tail of ["a", "b", "\0", "é", "😀"]) map.set(prefix + tail, length);
}
let sum = 0;
for (const [key, value] of map) {
  const copy = ("!" + key).slice(1);
  console.log(map.has(copy), map.get(copy), value);
  sum += map.get(copy)!;
}
console.log(map.size, sum);
for (let i = 0; i < 200; i++) {
  const key = "churn-" + i;
  map.set(key, i);
  if (i >= 7) map.delete("churn-" + (i - 7));
}
console.log(Array.from(map.keys()).slice(-7).join("|"));

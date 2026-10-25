// for-of over Object.values and its length in JavaScript, where values
// are checked-dynamic arrays that the program may also keep and change.
function sum(u) {
  let total = 0;
  for (const v of Object.values(u)) if (typeof v === "number") total += v;
  return total;
}
const values = Object.values({ a: 1, b: "x", c: 2 });
values.push(10);
console.log(sum({ a: 1, b: "x", c: 2 }), Object.values({ a: 1, b: 2 }).length, values.length, sum(values));
const list = { first: [4], second: 5 };
for (const v of Object.values(list)) console.log(v);

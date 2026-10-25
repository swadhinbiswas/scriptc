// Compound assignment with JSON.parse operands in JavaScript: numeric and
// string locals, fields, and elements keep Node's dynamic semantics,
// including a number local that becomes a string through `+=`.
const d = JSON.parse('{"n":5,"s":"x","f":2.5,"arr":[1,2,3]}');
const rows = JSON.parse('[{"score":3},{"score":4},{"score":"7"}]');

let a = 10;
a += d.n;
a -= d.f;
a *= d.n;
a /= d.arr[1];
a %= d.n;
a **= d.arr[1];
console.log(a);

let bits = 0xff;
bits &= d.n;
bits |= d.arr[2];
bits <<= d.n;
bits >>>= d.arr[0];
console.log(bits);

let checksum = 0;
for (let i = 0; i < rows.length; i++) checksum += rows[i].score;
console.log(checksum, typeof checksum);

let becomes = 1;
becomes += d.s;
console.log(becomes, typeof becomes);

let label = "n=";
label += d.n;
label += d.arr;
console.log(label);

const totals = { count: 1, name: "t" };
totals.count += d.n;
totals.name += d.s;
console.log(totals.count, totals.name);

const nums = [1, 2];
nums[0] += d.n;
nums[1] -= d.s;
console.log(nums);

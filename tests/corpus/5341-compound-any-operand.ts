// Compound assignment with an untyped (`any`) right operand lowers exactly
// like the expanded `x = x op rhs`: number and string locals, record fields,
// array elements, and `any` targets, across every compound operator.
const d: any = JSON.parse('{"n":5,"s":"x","f":2.5,"neg":-3,"big":"12","arr":[1,2,3]}');
const rows: any = JSON.parse('[{"score":3},{"score":4},{"score":"7"}]');

// number locals: arithmetic and bitwise operators
let a: number = 10;
a += d.n;
console.log("+=", a);
a -= d.f;
console.log("-=", a);
a *= d.neg;
console.log("*=", a);
a /= d.n;
console.log("/=", a);
a %= d.n;
console.log("%=", a);
a **= d.n;
console.log("**=", a);
let bits: number = 0xff;
bits &= d.n;
bits |= d.arr[2];
bits ^= d.neg;
console.log("bitwise", bits);
bits <<= d.n;
bits >>= d.arr[0];
bits >>>= d.arr[1];
console.log("shifts", bits);

// numeric operators coerce a string operand with ToNumber, exactly as Node
let coerced: number = 100;
coerced -= d.big;
coerced *= d.s;
console.log("coerced", coerced);

// the benchmark shape: summing a field of parsed rows into a number local
let checksum: number = 0;
for (let i: number = 0; i < 2; i++) checksum += rows[i].score;
console.log("checksum", checksum);

// string locals concatenate every operand
let label: string = "n=";
label += d.n;
label += d.arr;
label += d.missing;
console.log(label);

// `any` targets keep Node's dynamic + (concatenation once a string appears)
let acc: any = 1;
acc += d.n;
acc += d.s;
console.log(acc, typeof acc);
let num: any = "8";
num -= d.n;
console.log(num, typeof num);

// record fields
const totals = { count: 1, name: "t" };
totals.count += d.n;
totals.count *= d.f;
totals.name += d.n;
console.log(totals.count, totals.name);

// array elements, including a missing element (NaN in, like Node)
const nums: number[] = [1, 2];
nums[0] += d.n;
nums[1] **= d.arr[1];
nums[2] += d.n;
console.log(nums);
const words: string[] = ["w"];
words[0] += d.n;
words[0] += d.s;
console.log(words);

// the value of a compound assignment expression
let v: number = 1;
const result = (v += d.n);
console.log(result, v);

// bigint targets with a bigint-valued `any`
let big: bigint = 2n;
const three: any = 3n;
big += three;
big *= three;
console.log(big);

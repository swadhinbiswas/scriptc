// Arrays used as double-ended queues: runs of unshift (one value, several
// values, spread) on arrays long enough to reserve room in front of their
// elements, mixed with push, pop, shift, splice, indexing and iteration.
function checksum(xs: number[]): number {
  let s = 0;
  for (let i = 0; i < xs.length; i++) s = (s * 31 + xs[i]!) % 1000000007;
  return s;
}

// A long run of single unshifts builds the array in reverse.
const rev: number[] = [];
for (let i = 0; i < 5000; i++) rev.unshift(i);
console.log("reverse", rev.length, rev[0], rev[4999], rev[2500], checksum(rev));
let ok = true;
for (let i = 0; i < rev.length; i++) if (rev[i] !== 4999 - i) ok = false;
console.log("reverse-order", ok);

// Several values at a time keep their argument order.
const many: number[] = [];
for (let i = 0; i < 300; i++) many.unshift(i, i + 0.5, -i);
console.log("many", many.length, many.slice(0, 6).join(","), many.slice(-3).join(","), checksum(many));

// Spread unshift, including the array itself.
const sp: number[] = [];
for (let i = 0; i < 20; i++) sp.push(i);
const extra = [100, 101, 102];
for (let i = 0; i < 5; i++) sp.unshift(...extra);
console.log("spread", sp.length, sp.slice(0, 7).join(","), sp[sp.length - 1]);
sp.unshift(...sp);
console.log("self-spread", sp.length, sp[0], sp[35], sp[69], checksum(sp));

// A deque: values enter at both ends and leave at both ends.
const dq: number[] = [];
const out: number[] = [];
for (let i = 0; i < 4000; i++) {
  if (i % 3 === 0) dq.unshift(i);
  else dq.push(i);
  if (i % 5 === 0 && dq.length > 0) out.push(dq.shift()!);
  if (i % 7 === 0 && dq.length > 0) out.push(dq.pop()!);
  if (i % 11 === 0) dq.unshift(-i, -i - 1);
}
let iterated = 0;
for (const x of dq) iterated += x;
console.log("deque", dq.length, dq[0], dq[dq.length - 1], checksum(dq), checksum(out), iterated);
console.log("deque-search", dq.indexOf(-11), dq.lastIndexOf(3), dq.includes(3999), dq.at(-2));
dq.splice(0, 100);
dq.splice(10, 5, 1, 2, 3);
dq.unshift(...dq.splice(dq.length - 4, 4));
console.log("deque-splice", dq.length, dq.slice(0, 8).join(","), checksum(dq));

// Strings in a deque: the array owns every remaining element.
const words: string[] = [];
for (let i = 0; i < 200; i++) {
  words.unshift("w" + i);
  if (i % 4 === 0) words.push("t" + i);
  if (i % 9 === 0) words.shift();
}
console.log("words", words.length, words[0], words[words.length - 1], words.slice(50, 53).join(","));
console.log("words-join", words.join("").length, words.filter((w) => w.startsWith("t")).length);

// Holes stay holes when values are unshifted in front of them.
const holed: (number | undefined)[] = [];
for (let i = 0; i < 30; i++) holed.push(i);
holed.length = 34;
holed[32] = 32;
holed.copyWithin(5, 33, 34);
for (let i = 0; i < 20; i++) holed.unshift(-i);
const marks: string[] = [];
for (let i = 0; i < holed.length; i++) marks.push(i in holed ? "v" : "_");
console.log("holed", holed.length, marks.join(""), holed[24], 25 in holed, holed[52]);
holed.length = 10;
holed.unshift(1, 2);
console.log("holed-trim", holed.join(","));

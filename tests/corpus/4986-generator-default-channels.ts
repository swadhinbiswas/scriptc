// The lib's default channels: Generator<T> has any return and next
// values. Typed yields beside them still read correctly through records,
// return(), for-of, spread and inferred generators.
function* nums(): Generator<number> {
  yield 1;
  yield 2.5;
  return "done-value";
}
const it = nums();
const r1 = it.next();
console.log(r1.done, r1.value, typeof r1.value);
console.log(JSON.stringify(it.next()), JSON.stringify(it.next()), JSON.stringify(it.next()));
console.log([...nums()].join(","));
let sum = 0;
for (const x of nums()) sum += x;
console.log(sum);
const early = nums();
early.next();
console.log(JSON.stringify(early.return({ k: [1, 2] })));

function* strs(): Generator<string> {
  yield "a";
  yield "bc";
}
console.log([...strs()].join("-"), [...strs()].map((s) => s.length).join(""));
const sv = strs();
console.log(JSON.stringify(sv.next()), JSON.stringify(sv.next()), JSON.stringify(sv.next()));

function* bools(): Generator<boolean> {
  yield true;
  yield false;
}
console.log(JSON.stringify([...bools()]));

// Any yields beside a typed return.
function* anyYields(): Generator<any, number> {
  yield "s";
  yield 3;
  yield { a: 1 };
  return 7;
}
const ay = anyYields();
for (let r = ay.next(); ; r = ay.next()) {
  console.log(JSON.stringify(r));
  if (r.done) break;
}

// Inferred channels.
function* inferred(n: number) {
  for (let i = 0; i < n; i++) yield i * 2;
}
let t = 0;
for (const x of inferred(5)) t += x;
console.log(t, [...inferred(3)].join(","));
const inf = inferred(2);
console.log(JSON.stringify(inf.next()), JSON.stringify(inf.next()), JSON.stringify(inf.next()));

// A typed generator assigned to a default-channel annotation.
function* typed(): Generator<number, void, undefined> {
  yield 4;
  yield 5;
}
const loose: Generator<number> = typed();
console.log([...loose].join(","));

// yield* over arrays and strings walks the built-in iterator in place:
// arrays are read live, strings step by code point, next(v) values are
// dropped, return(v) completes the outer generator, and throw(e) raises
// a TypeError because these iterators have no throw() method.
function* overArray(xs: number[]): Generator<number, string, undefined> {
  yield 0;
  yield* xs;
  return "array done";
}
console.log([...overArray([1, 2, 3])], [...overArray([])]);
const ga = overArray([7, 8]);
console.log(JSON.stringify(ga.next()), JSON.stringify(ga.next()), JSON.stringify(ga.next()));
console.log(JSON.stringify(ga.next()), JSON.stringify(ga.next()));

// Pushes during delegation are visited; truncation ends it.
const live = [1, 2];
const gl = overArray(live);
gl.next();
console.log(gl.next().value);
live.push(3, 4);
console.log(gl.next().value, gl.next().value, gl.next().value);
live.length = 0;
console.log(JSON.stringify(gl.next()));

// An array literal operand, and a typed next channel whose values the
// array iterator ignores.
function* typedNext(): Generator<string, void, number> {
  yield* ["a", "b"];
  const got = yield "c";
  console.log("got", got);
}
const tn = typedNext();
console.log(tn.next(1).value, tn.next(2).value, tn.next(3).value, JSON.stringify(tn.next(4)));

// return() while delegating runs the outer finally blocks.
function* withFinally(): Generator<string, string, undefined> {
  try {
    yield* "xyz";
    return "never";
  } finally {
    console.log("finally ran");
  }
}
const wf = withFinally();
console.log(wf.next().value);
console.log(JSON.stringify(wf.return("early")), JSON.stringify(wf.next()));

// throw() while delegating: the outer generator sees a TypeError.
function* catches(): Generator<number, string, undefined> {
  try {
    yield* [10, 20, 30];
  } catch (e) {
    console.log("caught", e instanceof TypeError, (e as Error).message);
    yield -1;
    return "recovered";
  }
  return "finished";
}
const gc = catches();
console.log(gc.next().value);
console.log(JSON.stringify(gc.throw(new Error("boom"))), JSON.stringify(gc.next()));

function* plain(): Generator<string, void, undefined> {
  yield* ["p", "q"];
}
const gp = plain();
gp.next();
try {
  gp.throw("ignored");
} catch (e) {
  console.log("consumer caught", e instanceof TypeError, (e as Error).message);
}
console.log(JSON.stringify(gp.next()));

// Strings step by code point, including astral characters.
function* chars(s: string): Generator<string, void, undefined> {
  yield* s;
}
console.log([...chars("a😀b€")], [...chars("")].length, [...chars("😀😀")].length);

// Arrays of objects yield the same objects.
class Box {
  n: number;
  constructor(n: number) {
    this.n = n;
  }
}
const boxes = [new Box(1), new Box(2)];
function* overBoxes(): Generator<Box, void, undefined> {
  yield* boxes;
}
const seen = [...overBoxes()];
console.log(seen[0] === boxes[0], seen[1] === boxes[1], seen.length);

// The value of yield* over a built-in iterator is undefined.
function* valued(): Generator<number, string, undefined> {
  const r = yield* [5, 6];
  return "r=" + String(r);
}
const gv = valued();
console.log(gv.next().value, gv.next().value, JSON.stringify(gv.next()));

// Holes and undefined elements reach an optional channel as undefined.
function* optional(xs: (number | undefined)[]): Generator<number | undefined, void, undefined> {
  yield* xs;
}
const holey: (number | undefined)[] = [1, undefined];
holey[3] = 4;
console.log([...optional(holey)]);

// Elements convert into a wider yield channel.
function* mixed(): Generator<number | string, void, undefined> {
  yield* [1, 2];
  yield* "ab";
}
console.log([...mixed()]);
function* unknowns(): Generator<unknown, void, undefined> {
  yield* [1, 2];
  yield* ["x"];
}
console.log([...unknowns()]);

// Nested delegation through generators and arrays.
function* inner(): Generator<number, void, undefined> {
  yield* [1, 2];
}
function* outer(): Generator<number, void, undefined> {
  yield* inner();
  yield* [3];
  yield* inner();
}
console.log([...outer()]);

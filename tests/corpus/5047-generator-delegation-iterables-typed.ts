// yield* over non-generator iterables from generators whose next channel
// is typed or dyn: iterator classes with their own return() and throw()
// methods, iterators without them, iterable objects, and dyn iterables.
function show(r: IteratorResult<unknown, unknown>): string {
  return "done=" + r.done + " value=" + JSON.stringify(r.value);
}
// An iterator class that records every protocol call.
class Recorder {
  log: string[] = [];
  private i = 0;
  private readonly limit: number;
  constructor(limit: number) {
    this.limit = limit;
  }
  [Symbol.iterator](): Recorder {
    return this;
  }
  next(v?: unknown): IteratorResult<number, string> {
    this.log.push("next(" + JSON.stringify(v) + ")");
    if (this.i >= this.limit) return { done: true, value: "rec done" };
    return { done: false, value: this.i++ };
  }
  return(v?: unknown): IteratorResult<number, string> {
    this.log.push("return(" + JSON.stringify(v) + ")");
    return { done: true, value: "rec returned" };
  }
  throw(e?: unknown): IteratorResult<number, string> {
    this.log.push("throw(" + String(e) + ")");
    return { done: false, value: -1 };
  }
}
function* overRecorder(rec: Recorder): Generator<number, string, string> {
  const r = yield* rec;
  return "outer got " + r;
}
const rec1 = new Recorder(2);
const o1 = overRecorder(rec1);
console.log(show(o1.next("first")));
console.log(show(o1.next("second")));
console.log(show(o1.next("third")));
console.log(rec1.log.join(" "));

const rec2 = new Recorder(5);
const o2 = overRecorder(rec2);
o2.next("a");
console.log(show(o2.throw("t1")));
console.log(show(o2.next("b")));
console.log(show(o2.return("stop")));
console.log(rec2.log.join(" "));

// An iterator without throw(): yield* closes it and throws a TypeError.
class NoThrow {
  closed = false;
  private n = 0;
  [Symbol.iterator](): NoThrow {
    return this;
  }
  next(): IteratorResult<number, undefined> {
    return { done: false, value: this.n++ };
  }
  return(): IteratorResult<number, undefined> {
    this.closed = true;
    return { done: true, value: undefined };
  }
}
function* overNoThrow(it: NoThrow): Generator<number, void, undefined> {
  try {
    yield* it;
  } catch (e) {
    console.log("caught", e instanceof TypeError, (e as Error).message);
  }
}
const nt = new NoThrow();
const o3 = overNoThrow(nt);
o3.next();
o3.next();
console.log(JSON.stringify(o3.throw(new Error("x"))), nt.closed);

// An iterable object literal.
const triple = {
  *[Symbol.iterator](): Generator<string, void, unknown> {
    yield "t1";
    yield "t2";
    yield "t3";
  },
};
function* overLiteral(): Generator<string, string, string> {
  yield* triple;
  return "literal done";
}
const lit: string[] = [];
const ls = overLiteral();
for (let r = ls.next("a"); !r.done; r = ls.next("b")) lit.push(r.value);
console.log(lit.join(","));

// A dyn iterable under a dyn next channel.
function* overAny(source: any): Generator<any, any, any> {
  const r = yield* source;
  return ["any done", r];
}
const anyRec = new Recorder(1);
const oa = overAny(anyRec);
console.log(show(oa.next(1)));
console.log(show(oa.next({ sent: true })));
console.log(anyRec.log.join(" "));

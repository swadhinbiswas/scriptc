// return() and throw() arriving while a generator is suspended inside
// yield*: both forward into the delegate before the outer body unwinds.
function* inner(): Generator<number, string, undefined> {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log("inner finally");
  }
  return "inner done";
}
function* outer(): Generator<number, void, undefined> {
  try {
    const r = yield* inner();
    console.log("never", r);
  } finally {
    console.log("outer finally");
  }
}
const a = outer();
console.log(JSON.stringify(a.next()));
console.log(JSON.stringify(a.return()));
console.log(JSON.stringify(a.next()));

// throw(): the delegate catches and keeps yielding, then finishes; the
// outer body continues with the delegate's return value.
function* catcher(): Generator<number, string, undefined> {
  try {
    yield 1;
  } catch (e) {
    console.log("catcher caught", (e as Error).message);
    yield 99;
  }
  return "recovered";
}
function* continues(): Generator<number, void, undefined> {
  const r = yield* catcher();
  console.log("continues with", r);
  yield 5;
}
const b = continues();
console.log(JSON.stringify(b.next()));
console.log(JSON.stringify(b.throw(new Error("boom"))));
console.log(JSON.stringify(b.next()));
console.log(JSON.stringify(b.next()));

// throw(): the delegate does not catch, so the outer catch sees it.
function* bare(): Generator<string, void, undefined> {
  yield "x";
  yield "y";
}
function* outerCatch(): Generator<string, string, undefined> {
  try {
    yield* bare();
  } catch (e) {
    console.log("outer caught", (e as Error).message);
    yield "after catch";
    return "handled";
  }
  return "unreached";
}
const c = outerCatch();
console.log(JSON.stringify(c.next()));
console.log(JSON.stringify(c.throw(new RangeError("range"))));
console.log(JSON.stringify(c.next()));

// throw() of a primitive and of a custom error class reaches the delegate
// unchanged.
class Oops extends Error {
  code: number;
  constructor(code: number) {
    super("oops " + code);
    this.code = code;
  }
}
function* classify(): Generator<string, void, undefined> {
  for (;;) {
    try {
      yield "ready";
    } catch (e) {
      if (e instanceof Oops) console.log("Oops", e.code, e.message);
      else console.log("other", typeof e, String(e));
    }
  }
}
function* wrapClassify(): Generator<string, void, undefined> {
  yield* classify();
}
const w = wrapClassify();
w.next();
w.throw(new Oops(7));
w.throw("plain string");
w.throw(42);
console.log(JSON.stringify(w.return()));

// return(v) with a value on matching return channels.
function* valued(): Generator<number, string, undefined> {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log("valued cleanup");
  }
  return "normal";
}
function* passValue(): Generator<number, string, undefined> {
  const r = yield* valued();
  return "outer " + r;
}
const pv = passValue();
pv.next();
console.log(JSON.stringify(pv.return("early")));
console.log(JSON.stringify(pv.next()));

// A delegate whose finally overrides the return value.
function* overriding(): Generator<number, string, undefined> {
  try {
    yield 1;
  } finally {
    return "from finally";
  }
}
function* passOverride(): Generator<number, string, undefined> {
  return yield* overriding();
}
const po = passOverride();
po.next();
console.log(JSON.stringify(po.return("asked")));

// A delegate whose finally yields: return() resumes as a yield, and the
// next next() lets yield* finish normally with the parked return value.
function* parking(): Generator<number, string, undefined> {
  try {
    yield 1;
    yield 2;
  } finally {
    console.log("parking finally");
    yield 3;
    console.log("parking finally resumed");
  }
  return "parking done";
}
function* afterPark(): Generator<number, string, undefined> {
  const v = yield* parking();
  console.log("yield* produced", v);
  yield 4;
  return "afterPark done";
}
const ap = afterPark();
console.log(JSON.stringify(ap.next()));
console.log(JSON.stringify(ap.return("ret")));
console.log(JSON.stringify(ap.next()));
console.log(JSON.stringify(ap.next()));

// Three levels: every finally runs innermost first.
function* level(name: string, depth: number): Generator<string, void, undefined> {
  try {
    if (depth === 0) {
      yield name + " leaf 1";
      yield name + " leaf 2";
    } else {
      yield* level(name + ">" + depth, depth - 1);
    }
  } finally {
    console.log("finally", name);
  }
}
const lv = level("root", 2);
console.log(lv.next().value);
console.log(JSON.stringify(lv.return()));
const lt = level("root", 2);
console.log(lt.next().value);
try {
  lt.throw(new Error("deep"));
} catch (e) {
  console.log("escaped", (e as Error).message);
}
console.log(JSON.stringify(lt.next()));

// Typed next channel with return() and throw() through yield*.
function* typedInner(): Generator<string, number, string> {
  let count = 0;
  try {
    for (;;) {
      const got = yield "count " + count;
      if (got === "fail") throw new Error("inner failed");
      count++;
    }
  } catch (e) {
    console.log("typedInner caught", (e as Error).message);
    return -1;
  } finally {
    console.log("typedInner finally at", count);
  }
}
function* typedOuter(): Generator<string, number, string> {
  try {
    const r = yield* typedInner();
    return r * 100;
  } finally {
    console.log("typedOuter finally");
  }
}
const t1 = typedOuter();
t1.next("start");
t1.next("a");
console.log(JSON.stringify(t1.throw(new Error("thrown in"))));
const t2 = typedOuter();
t2.next("start");
t2.next("a");
console.log(JSON.stringify(t2.return(5)));
const t3 = typedOuter();
t3.next("start");
try {
  t3.next("fail");
} catch (e) {
  console.log("unexpected", (e as Error).message);
}

// for-of break over a delegating generator closes the delegate.
function* closable(): Generator<number, void, undefined> {
  try {
    yield 1;
    yield 2;
    yield 3;
  } finally {
    console.log("closable closed");
  }
}
function* viaDelegation(): Generator<number, void, undefined> {
  try {
    yield* closable();
  } finally {
    console.log("viaDelegation closed");
  }
}
for (const v of viaDelegation()) {
  console.log("for-of", v);
  if (v === 2) break;
}
console.log([...viaDelegation()].join(","));

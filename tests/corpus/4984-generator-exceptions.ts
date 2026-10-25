// Exceptions inside generators: escaping to the consumer, caught inside the
// body, thrown from finally, injected with throw(), and the generator's
// state afterwards. Deep recursion inside a generator body overflows into a
// catchable RangeError.
function* failing(at: number): Generator<number, void, undefined> {
  for (let i = 0; ; i++) {
    if (i === at) throw new Error("failed at " + i);
    yield i;
  }
}
const seen: number[] = [];
try {
  for (const x of failing(3)) seen.push(x);
} catch (e) {
  console.log((e as Error).message, seen.join(","));
}
const f = failing(1);
console.log(f.next().value);
try {
  f.next();
} catch (e) {
  console.log("next threw", (e as Error).message);
}
console.log(JSON.stringify(f.next()));

function* resilient(): Generator<string, string, undefined> {
  let errors = 0;
  for (let i = 0; i < 3; i++) {
    try {
      yield "step" + i;
    } catch (e) {
      errors++;
      yield "recovered from " + (e as Error).message;
    }
  }
  return "errors=" + errors;
}
const r = resilient();
console.log(r.next().value);
console.log(r.throw(new Error("boom")).value);
console.log(r.next().value);
console.log(r.next().value);
console.log(JSON.stringify(r.next()));
console.log(JSON.stringify(r.next()));

function* finallyThrows(): Generator<number, void, undefined> {
  try {
    yield 1;
  } finally {
    throw new Error("from finally");
  }
}
try {
  for (const x of finallyThrows()) {
    console.log("got", x);
    break;
  }
} catch (e) {
  console.log("break raised", (e as Error).message);
}
const ft = finallyThrows();
ft.next();
try {
  ft.return();
} catch (e) {
  console.log("return raised", (e as Error).message);
}

function* uncaught(): Generator<number, void, undefined> {
  try {
    yield 1;
  } finally {
    console.log("uncaught cleanup");
  }
}
const u = uncaught();
u.next();
try {
  u.throw(new TypeError("injected"));
} catch (e) {
  console.log((e as Error).name, (e as Error).message);
}
console.log(JSON.stringify(u.next()));

// A string and a number thrown through a generator.
function* thrower(kind: number): Generator<number, void, undefined> {
  yield 0;
  if (kind === 0) throw "plain string";
  throw 42;
}
for (const k of [0, 1]) {
  try {
    for (const x of thrower(k)) void x;
  } catch (e) {
    console.log(typeof e, e);
  }
}

// Re-entering a running generator.
class Holder {
  gen: Generator<number, void, undefined> = this.make();
  *make(): Generator<number, void, undefined> {
    try {
      this.gen.next();
    } catch (e) {
      console.log((e as Error).name, (e as Error).message);
    }
    yield 1;
  }
}
const holder = new Holder();
console.log(holder.gen.next().value);

// Stack overflow inside a generator body.
function down(n: number): number {
  return n === 0 ? 0 : 1 + down(n - 1);
}
function* deep(): Generator<string, void, undefined> {
  try {
    yield "depth " + down(1e7);
  } catch (e) {
    yield "overflow " + (e instanceof RangeError);
  }
  yield "after";
}
console.log([...deep()].join(" | "));

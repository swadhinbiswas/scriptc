// Early exits from for-of close the generator: finally blocks run on break,
// return, labeled continue past the loop and a throw from the loop body.
// A finally that yields during the close keeps the generator open.
const log: string[] = [];
function* counted(tag: string, n: number): Generator<number, void, undefined> {
  try {
    for (let i = 0; i < n; i++) {
      log.push(`${tag} yield ${i}`);
      yield i;
    }
    log.push(`${tag} exhausted`);
  } finally {
    log.push(`${tag} finally`);
  }
}
for (const x of counted("a", 5)) {
  if (x === 2) break;
}
function firstOver(limit: number): number {
  for (const x of counted("b", 10)) {
    if (x > limit) return x;
  }
  return -1;
}
console.log(firstOver(3));
outer: for (let round = 0; round < 2; round++) {
  for (const x of counted(`c${round}`, 4)) {
    if (x === 1) continue outer;
  }
}
try {
  for (const x of counted("d", 4)) {
    if (x === 2) throw new Error("body failed at " + x);
  }
} catch (e) {
  log.push("caught " + (e as Error).message);
}
for (const x of counted("e", 3)) log.push("e saw " + x);
console.log(log.join("\n"));

// Nested generators: breaking the outer loop closes both, innermost first.
function* inner(): Generator<string, void, undefined> {
  try {
    yield "i1";
    yield "i2";
  } finally {
    console.log("inner finally");
  }
}
function* outerGen(): Generator<string, void, undefined> {
  try {
    for (const s of inner()) yield "outer:" + s;
  } finally {
    console.log("outer finally");
  }
}
for (const s of outerGen()) {
  console.log(s);
  break;
}

// A finally that yields while being closed by return().
function* stubborn(): Generator<number, string, undefined> {
  try {
    yield 1;
    yield 2;
  } finally {
    yield 99;
    console.log("stubborn cleanup");
  }
  return "end";
}
const s = stubborn();
console.log(JSON.stringify(s.next()));
console.log(JSON.stringify(s.return("early")));
console.log(JSON.stringify(s.next()));
console.log(JSON.stringify(s.next()));

// return() and throw() on generators that never started, and after done.
function* never(): Generator<number, number, undefined> {
  console.log("never runs");
  yield 1;
  return 2;
}
const n1 = never();
console.log(JSON.stringify(n1.return(7)), JSON.stringify(n1.next()));
const n2 = never();
try {
  n2.throw(new Error("into unstarted"));
} catch (e) {
  console.log("throw on unstarted:", (e as Error).message);
}
console.log(JSON.stringify(n2.next()));
const n3 = never();
console.log(JSON.stringify(n3.next()), JSON.stringify(n3.next()), JSON.stringify(n3.next()));
console.log(JSON.stringify(n3.return(5)));

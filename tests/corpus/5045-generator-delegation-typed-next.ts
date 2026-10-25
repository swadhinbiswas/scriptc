// yield* into delegates with typed and dyn next channels: forwarded
// next(v), delegate return values, and nested delegation.
function* words(): Generator<number, string, string> {
  const a = yield 1;
  console.log("words got", a);
  const b = yield 2;
  console.log("words got", b);
  return a + "+" + b;
}
function* sentence(): Generator<number, string, string> {
  const joined = yield* words();
  console.log("joined", joined);
  const last = yield 3;
  return joined + "/" + last;
}
const s = sentence();
console.log(JSON.stringify(s.next("ignored")));
console.log(JSON.stringify(s.next("x")));
console.log(JSON.stringify(s.next("y")));
console.log(JSON.stringify(s.next("z")));
console.log(JSON.stringify(s.next("after")));

// Number and boolean next channels.
function* accumulate(limit: number): Generator<number, number, number> {
  let total = 0;
  while (total < limit) total += yield total;
  return total;
}
function* twice(): Generator<number, number, number> {
  const first = yield* accumulate(10);
  const second = yield* accumulate(first);
  return first + second;
}
const t = twice();
let step = t.next(0);
let sent = 1;
while (!step.done) {
  console.log("at", step.value);
  step = t.next(sent);
  sent += 2;
}
console.log("twice done", step.value);

function* flags(): Generator<string, number, boolean> {
  let count = 0;
  while (yield "flag" + count) count++;
  return count;
}
function* flagGroups(): Generator<string, void, boolean> {
  const a = yield* flags();
  yield "group a=" + a;
  const b = yield* flags();
  yield "group b=" + b;
}
const f = flagGroups();
const pushes = [true, true, false, false, true, false, true];
let fr = f.next(true);
for (const p of pushes) {
  console.log(JSON.stringify(fr));
  fr = f.next(p);
}
console.log(JSON.stringify(fr));

// Object next channel.
type Command = { op: string; n: number };
function* machine(): Generator<number, number, Command> {
  let acc = 0;
  for (;;) {
    const cmd = yield acc;
    if (cmd.op === "add") acc += cmd.n;
    else if (cmd.op === "mul") acc *= cmd.n;
    else return acc;
  }
}
function* session(): Generator<number, string, Command> {
  const r = yield* machine();
  return "result " + r;
}
const m = session();
m.next({ op: "noop", n: 0 });
m.next({ op: "add", n: 4 });
console.log(m.next({ op: "mul", n: 5 }).value);
console.log(JSON.stringify(m.next({ op: "stop", n: 0 })));

// Dyn next channels on either side.
function* anyEcho(): Generator<string, string, any> {
  let got = yield "start";
  while (got !== "end") got = yield "echo " + JSON.stringify(got);
  return "anyEcho done";
}
function* typedOuter(): Generator<string, void, string> {
  const r = yield* anyEcho();
  yield r;
}
const to = typedOuter();
console.log(to.next("first").value);
console.log(to.next("hello").value);
console.log(to.next("end").value);
console.log(JSON.stringify(to.next("more")));

function* anyOuter(): Generator<string, string, any> {
  const r = yield* anyEcho();
  return "outer saw " + r;
}
const ao = anyOuter();
ao.next();
console.log(ao.next(42).value);
console.log(ao.next({ k: [1, 2] }).value);
console.log(ao.next(null).value);
console.log(JSON.stringify(ao.next("end")));

// A delegate that ignores resumed values under a typed outer channel.
function* plain(): Generator<number, void, unknown> {
  yield 10;
  yield 20;
}
function* reader(): Generator<number, string, string> {
  yield* plain();
  const got = yield 30;
  return "reader got " + got;
}
const rd = reader();
console.log([rd.next("a"), rd.next("b"), rd.next("c"), rd.next("d")].map((r) => JSON.stringify(r)).join(" "));

// Three levels of typed delegation.
function* leaf(tag: string): Generator<string, number, number> {
  const a = yield tag + ":1";
  const b = yield tag + ":2";
  return a * b;
}
function* middle(): Generator<string, number, number> {
  const x = yield* leaf("L");
  const y = yield* leaf("R");
  return x + y;
}
function* top(): Generator<string, string, number> {
  const total = yield* middle();
  return "total " + total;
}
function driveTop(): void {
  const tp = top();
  const out: string[] = [];
  let tr = tp.next(0);
  let n = 2;
  while (!tr.done) {
    out.push(tr.value);
    tr = tp.next(n++);
  }
  console.log(out.join(","), tr.value);
}
driveTop();

// yield* in expression position with a typed channel.
function* sum2(): Generator<number, number, number> {
  return (yield 1) + (yield 2);
}
function* useSum(): Generator<number, number, number> {
  const v = (yield* sum2()) * 10 + (yield* sum2());
  return v;
}
const us = useSum();
us.next(0);
us.next(3);
us.next(4);
us.next(5);
console.log(JSON.stringify(us.next(6)));

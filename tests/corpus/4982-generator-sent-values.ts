// Values passed into next(v): numbers, strings, records and dyn values,
// ignored first arguments, and default (any) next channels.
function* accumulator(): Generator<number, number, number> {
  let total = 0;
  for (;;) {
    const v = yield total;
    if (v < 0) return total;
    total += v;
  }
}
const acc = accumulator();
console.log(acc.next(1000).value);
for (const v of [1, 2, 3, 4.5]) console.log(acc.next(v).value);
console.log(JSON.stringify(acc.next(-1)), JSON.stringify(acc.next(5)));

function* joiner(): Generator<string, string, string> {
  const parts: string[] = [];
  let s = yield "start";
  while (s !== "") {
    parts.push(s);
    s = yield parts.join("+");
  }
  return parts.join("/");
}
const j = joiner();
j.next("dropped");
console.log(j.next("x").value, j.next("yy").value, j.next("zzz").value);
console.log(j.next("").value);

type Cmd = { op: string; n: number };
function* machine(): Generator<number, void, Cmd> {
  let state = 0;
  for (;;) {
    const cmd = yield state;
    if (cmd.op === "add") state += cmd.n;
    else if (cmd.op === "mul") state *= cmd.n;
    else return;
  }
}
const m = machine();
m.next({ op: "ignored", n: 0 });
console.log(m.next({ op: "add", n: 3 }).value);
console.log(m.next({ op: "mul", n: 7 }).value);
console.log(JSON.stringify(m.next({ op: "halt", n: 0 })));

// Default channels: Generator<number> carries any return / next values.
function* loose(): Generator<number> {
  const a = yield 1;
  console.log("loose got", typeof a, a);
  const b = yield 2;
  console.log("loose got", typeof b, b);
  return "finished";
}
const l = loose();
console.log(JSON.stringify(l.next()));
console.log(JSON.stringify(l.next("str")));
console.log(JSON.stringify(l.next({ k: 1 })));
console.log(JSON.stringify(l.next()));
const l2 = loose();
l2.next();
console.log(JSON.stringify(l2.next()));
console.log(JSON.stringify(l2.next(42)));

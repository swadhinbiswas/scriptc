// A finished generator answers { value: undefined, done: true }, even where
// the checker types the value as the return channel. Reads of that value
// observe undefined, in sync and async generators alike.
function* counter(): Generator<number, number, undefined> {
  yield 1;
  return 2;
}
function show(n: number): string {
  return "show " + n;
}
function syncReads(): void {
  const g = counter();
  const first = g.next();
  const second = g.next();
  const after = g.next();
  console.log(JSON.stringify(after), after.value === undefined, typeof after.value);
  console.log(first.value + 1, second.value * 2, after.value + 1, `${after.value}`);
  console.log(show(after.value), show(second.value), String(after.value));
  const list: number[] = [];
  list.push(after.value);
  list.push(second.value);
  console.log(list, list.length);
  if (after.done) console.log("done value", after.value, after.value === undefined);
  const sum = [first, second, after].reduce((acc, r) => acc + (r.value ?? 100), 0);
  console.log(sum, after.value ?? "fallback", after.value || "falsy");
  const kept: number = after.value;
  console.log(kept, [after.value], after.value !== undefined ? "present" : "absent");
  // A yield-narrowed read keeps the plain yield channel.
  let total = 0;
  const again = counter();
  for (let r = again.next(); !r.done; r = again.next()) total += r.value;
  console.log(total, JSON.stringify(again.next()));
}
syncReads();

// Module-scope bindings of a finished result.
const top = counter();
top.next();
top.next();
const topAfter = top.next();
const topValue: number = topAfter.value;
console.log(topValue, typeof topAfter.value, JSON.stringify(topAfter));

function* labels(): Generator<string, string, undefined> {
  yield "a";
  return "z";
}
const lg = labels();
lg.next();
lg.next();
const lr = lg.next();
console.log(lr.value === undefined, lr.value + "!", JSON.stringify(lr));

async function* ticks(): AsyncGenerator<number, number, undefined> {
  yield 1;
  return 2;
}
async function asyncReads(): Promise<void> {
  const g = ticks();
  console.log(JSON.stringify(await g.next()), JSON.stringify(await g.next()));
  const after = await g.next();
  console.log(JSON.stringify(after), after.value === undefined, typeof after.value);
  const n: number = after.value;
  console.log(n, after.value + 1, `${after.value}`);
  const returned = await g.return(5);
  console.log(JSON.stringify(returned), typeof returned.value, returned.value + 1);
  const later = await g.next();
  console.log(JSON.stringify(later), typeof later.value);
}
asyncReads();

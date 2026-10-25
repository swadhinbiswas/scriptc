// `any` values flow through static functions, logical operators keep JS
// value semantics, compound assignment on an `any` local works (formerly a
// diagnostics fixture from the retired engine), and a churn loop pressures
// checked-value reference counting (the SAN lane's real test).
function pipe(v: any): any {
  return v;
}
function describe(v: any): string {
  return `${typeof v}:${v}`;
}
console.log(describe(pipe(42)), describe(pipe("s")), describe(pipe(true)));
const zero: any = 0;
const name: any = "fallback";
console.log(`${zero || name}`, `${name && zero}`, `${zero && name}`);
let acc: any = 1;
acc += 4;
acc *= 3;
console.log(`${acc}`);
let churn = 0;
for (let i = 0; i < 500; i = i + 1) {
  const tmp: any = { idx: i, label: `item${i}` };
  churn = churn + (tmp.idx as number);
}
console.log(churn);

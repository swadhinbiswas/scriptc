// Function-scoped var bindings read early by closures created inside the
// function, in loops, and through callbacks.
function outer(): void {
  const read = () => v;
  const text = () => "v=" + v;
  console.log("early", typeof read(), String(read()), text());
  var v = 1;
  console.log("late", read(), text());
}
outer();

function loops(): void {
  const fs: (() => string)[] = [];
  for (let i = 0; i < 3; i++) {
    fs.push(() => String(w));
    var w = "w" + i;
  }
  console.log(fs.map((f) => f()).join(","));
}
loops();

function counters(): number[] {
  const tick = () => ++n;
  const out = [tick()];
  var n = 10;
  out.push(tick(), tick());
  return out;
}
console.log(counters().map((x) => String(x)).join(","));

function settledLocal(): number {
  var total = 0;
  const add = (x: number) => (total += x);
  [1, 2, 3].forEach(add);
  for (var i = 0; i < 2; i++) total += i;
  return total * 10 + i;
}
console.log("settled", settledLocal());

function flags(): string {
  const check = () => (ready ? "ready" : "not ready");
  const first = check();
  var ready = true;
  return first + " then " + check();
}
console.log(flags());

// An annotated arrow returning a var captured before its statement.
function forwardCapture(): void {
  const read = (): number => n;
  console.log("annotated", read());
  var n = 5;
  console.log("annotated", read(), n);
}
forwardCapture();

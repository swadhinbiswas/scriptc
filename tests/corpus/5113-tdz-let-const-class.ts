// let, const and class bindings read through functions before their
// declarations run throw Node's ReferenceError.
function readLet(): number {
  return counter;
}
function readConst(): string {
  return greeting;
}
function makeWidget(): object {
  return new Widget();
}
function widgetTag(): string {
  return Widget.tag;
}
function widgetCount(): number {
  return Widget.count();
}
function isWidget(x: unknown): boolean {
  return x instanceof Widget;
}
function setTag(): void {
  Widget.tag = "changed";
}
const attempts: [string, () => unknown][] = [
  ["let", readLet],
  ["const", readConst],
  ["new", makeWidget],
  ["static field", widgetTag],
  ["static method", widgetCount],
  ["instanceof", () => isWidget({})],
  ["static write", setTag],
];
for (const [label, run] of attempts) {
  try {
    console.log(label, "ok", String(run()));
  } catch (e) {
    console.log(label, (e as Error).name, (e as Error).message, e instanceof ReferenceError);
  }
}
let counter = 1;
const greeting = "hi";
class Widget {
  static tag = "w";
  static made = Widget.tag + "!";
  static count(): number {
    return 7;
  }
}
console.log(readLet(), readConst(), typeof makeWidget(), widgetTag(), widgetCount());
console.log(isWidget(makeWidget()), Widget.made);
setTag();
console.log(widgetTag());

// A static initializer that calls out to code naming the class.
function early(): string {
  return Later.label;
}
class Later {
  static label = "later";
  static probe = (() => {
    try {
      return early();
    } catch (e) {
      return (e as Error).message;
    }
  })();
}
console.log(Later.probe, early());

// Evaluation order around an early class reference: `x instanceof K`
// evaluates x before reading K; `new K(...)`, `K.m(...)` and `K.x = v`
// read K first.
const order: string[] = [];
const note = (label: string): number => {
  order.push(label);
  return 1;
};
function probes(): void {
  const cases: [string, () => unknown][] = [
    ["instanceof", () => ({ v: note("left") }) instanceof Ordered],
    ["new", () => new Ordered(note("ctor arg"))],
    ["static call", () => Ordered.make(note("call arg"))],
    [
      "static write",
      () => {
        Ordered.count = note("rhs");
      },
    ],
    ["unknown instanceof", () => (JSON.parse(String(note("json"))) as unknown) instanceof Ordered],
  ];
  for (const [label, run] of cases) {
    order.length = 0;
    try {
      run();
      console.log(label, "ok", order.join(","));
    } catch (e) {
      console.log(label, (e as Error).name, "after [" + order.join(",") + "]");
    }
  }
}
probes();
class Ordered {
  static count = 0;
  n: number;
  constructor(n: number) {
    this.n = n;
  }
  static make(n: number): Ordered {
    return new Ordered(n);
  }
}
probes();

// A statically decided instanceof against a class without a constructor
// still reads the class after its left operand.
function plainProbe(): string {
  order.length = 0;
  try {
    return String(({ v: note("plain left") }) instanceof Plain) + " " + order.join(",");
  } catch (e) {
    return (e as Error).name + " after [" + order.join(",") + "]";
  }
}
console.log(plainProbe());
class Plain {}
console.log(plainProbe());

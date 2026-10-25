// Subclasses that are declared and tested but never constructed still
// compile and link: instanceof against them answers false for other
// values, plain events and targets included.
class Unused extends Event {
  readonly extra = 1;
}

class Idle extends EventTarget {
  readonly name = "idle";
}

function classify(value: unknown): string {
  if (value instanceof Unused) return "unused event";
  if (value instanceof Idle) return "idle target";
  return typeof value;
}

console.log(classify(1), classify("x"), classify({ type: "x" }), classify(null));
console.log(classify(new Event("x")), classify(new EventTarget()));

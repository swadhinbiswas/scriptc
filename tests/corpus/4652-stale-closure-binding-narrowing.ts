// An assignment narrows a `let` (or a property) to the assigned arm, and a
// later null test narrows away null. TypeScript keeps the assignment's
// narrowing across a call to a closure or method that stores another arm,
// so after `if (acc !== null)` the checker still types the read as the old
// arm. A slot that accepts the declared type minus null (a return, an
// argument, an annotated declaration, an assignment) must receive the value
// stored now, as Node passes it on.

type Lit = { kind: "lit"; value: number };
type Sum = { kind: "sum"; left: Expr; right: Expr };
type Neg = { kind: "neg"; operand: Expr };
type Expr = Lit | Sum | Neg;

function show(e: Expr): string {
  switch (e.kind) {
    case "lit":
      return String(e.value);
    case "sum":
      return `(${show(e.left)} + ${show(e.right)})`;
    case "neg":
      return `-${show(e.operand)}`;
  }
}

// The compiler's own shape: chunks flushed by a closure into an
// accumulator that the loop also wraps directly.
function fold(values: readonly (number | "neg")[]): Expr {
  let pending: number[] = [];
  let acc: Expr | null = null;
  const flush = (): void => {
    if (pending.length === 0) return;
    let chunk: Expr = { kind: "lit", value: pending[0]! };
    for (const v of pending.slice(1)) chunk = { kind: "sum", left: chunk, right: { kind: "lit", value: v } };
    acc = acc === null ? chunk : { kind: "sum", left: acc, right: chunk };
    pending = [];
  };
  for (const v of values) {
    if (v === "neg") {
      flush();
      acc ??= { kind: "lit", value: 0 };
      acc = { kind: "neg", operand: acc };
      continue;
    }
    pending.push(v);
  }
  flush();
  if (acc !== null) return acc;
  return { kind: "lit", value: 0 };
}

console.log("fold:", show(fold([1, 2])));
console.log("fold:", show(fold([1, "neg", 2, 3])));
console.log("fold:", show(fold(["neg", 4])));
console.log("fold:", show(fold([])));

function describe(e: Expr): string {
  return `${e.kind} ${show(e)}`;
}

// Argument, annotated declaration and assignment slots.
function slots(replace: boolean): string[] {
  let current: Expr | null = null;
  const reset = (): void => {
    current = { kind: "lit", value: 7 };
  };
  current = { kind: "neg", operand: { kind: "lit", value: 1 } };
  if (replace) reset();
  const out: string[] = [];
  if (current !== null) {
    out.push(describe(current));
    const held: Expr = current;
    out.push(held.kind);
    let assigned: Expr = { kind: "lit", value: 0 };
    assigned = current;
    out.push(show(assigned));
  }
  return out;
}

console.log("slots:", slots(false).join(" | "));
console.log("slots:", slots(true).join(" | "));

// Elements and properties of literals that sit in typed slots.
function containers(): string[] {
  let item: Expr | null = null;
  const swap = (): void => {
    item = { kind: "lit", value: 3 };
  };
  item = { kind: "neg", operand: { kind: "lit", value: 2 } };
  swap();
  const out: string[] = [];
  if (item !== null) {
    const list: Expr[] = [item, { kind: "lit", value: 4 }];
    const box: { value: Expr; label: string } = { value: item, label: "box" };
    const nested: { items: Expr[] } = { items: [item] };
    const shorthand: { item: Expr } = { item };
    out.push(list.map(show).join(","), show(box.value), show(nested.items[0]!), show(shorthand.item));
  }
  return out;
}

console.log("containers:", containers().join(" | "));

// The same through a property a method replaces.
class Holder {
  expr: Expr | null = null;
  replace(): void {
    this.expr = { kind: "lit", value: 42 };
  }
}

function viaMember(h: Holder, replace: boolean): Expr {
  h.expr = { kind: "neg", operand: { kind: "lit", value: 5 } };
  if (replace) h.replace();
  if (h.expr !== null) return h.expr;
  return { kind: "lit", value: -1 };
}

console.log("member:", show(viaMember(new Holder(), false)));
console.log("member:", show(viaMember(new Holder(), true)));

// No intervening call: the narrowing is current and the read keeps it.
function direct(): number {
  let e: Expr | null = null;
  e = { kind: "lit", value: 9 };
  if (e !== null) return e.value;
  return 0;
}

console.log("direct:", direct());

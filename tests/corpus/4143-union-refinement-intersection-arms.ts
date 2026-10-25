// A refinement intersection (`Expr & { kind: "mul" }`) names the union
// member it refines. Add and Mul are separate recursive declarations with
// the same layout, so each owns its own union arm; the refined type must
// resolve to Mul's arm, not to the structurally identical Add arm. The
// natively compiled compiler hit this in its own IR (`IrExpr & { kind:
// "bin" }` resolving to the `logical` arm) and threw the stranded-arm
// TypeError on a valid assertion.
type Num = { kind: "num"; value: number };
type Add = { kind: "add"; left: Expr; right: Expr };
type Mul = { kind: "mul"; left: Expr; right: Expr };
type Expr = Num | Add | Mul;

// Mapping Mul from a declaration first makes it a recursive knot of its own.
function describeMul(m: Mul): string {
  return `mul(${show(m.left)}, ${show(m.right)})`;
}

function show(e: Expr): string {
  switch (e.kind) {
    case "num":
      return String(e.value);
    case "add":
      return `(${show(e.left)} + ${show(e.right)})`;
    case "mul":
      return `(${show(e.left)} * ${show(e.right)})`;
  }
}

const num = (value: number): Expr => ({ kind: "num", value });

// Checked assertion from an unnarrowed parameter.
function leftOfMul(e: Expr): Expr {
  return (e as Expr & { kind: "mul" }).left;
}
function leftOfAdd(e: Expr): Expr {
  return (e as Expr & { kind: "add" }).left;
}

// A type guard spelled with the refinement intersection.
const isMul = (e: Expr): e is Expr & { kind: "mul" } => e.kind === "mul";

const exprs: Expr[] = [
  { kind: "mul", left: num(2), right: num(3) },
  { kind: "add", left: num(4), right: num(5) },
  num(6),
];

console.log(describeMul(exprs[0] as Mul));
console.log(show(leftOfMul(exprs[0]!)), show(leftOfAdd(exprs[1]!)));
for (const e of exprs) {
  if (isMul(e)) console.log("guard", show(e.right), show(e));
  else console.log("other", e.kind);
}
console.log(exprs.filter((e): boolean => isMul(e)).length, exprs.findIndex(isMul));

// The refined view is the same object: a write through it is visible
// through the original binding (no layout copy).
const product: Expr = { kind: "mul", left: num(7), right: num(8) };
const refined = product as Expr & { kind: "mul" };
refined.left = num(9);
console.log(show(product), refined === product);

import type { IrExpr, IrType, SrcLoc } from "../../packages/compiler/src/ir/ir.js";

type Expr = { kind: "number"; value: number } | { kind: "sum"; values: Expr[] };

function valueOf(expr: Expr): number {
  return expr.kind === "number" ? expr.value : expr.values.reduce((sum, value) => sum + valueOf(value), 0);
}

const values: Expr[] = [{ kind: "number", value: 1 }];
values.forEach((value, index) => {
  values[index] = { kind: "sum", values: [value, { kind: "number", value: 2 }] };
});
console.log(valueOf(values[0]!));

const combined = [2, 3, 4].reduce<Expr>((left, right) => ({ kind: "sum", values: [left, { kind: "number", value: right }] }), { kind: "number", value: 1 });
console.log(valueOf(combined));
const reversed = [2, 3, 4].reduceRight<Expr>((left, right) => ({ kind: "sum", values: [left, { kind: "number", value: right }] }), { kind: "number", value: 1 });
console.log(valueOf(reversed));

// The frontend's recursive expression union has nested type and location
// fields. Construct values directly in that destination, including a
// callback parameter narrowed by one of its nested discriminants.
const location: SrcLoc = { file: "fixture.ts", start: 0, end: 1 };
const booleanType: IrType = { kind: "bool" };
const stringType: IrType = { kind: "string" };
const dynType: IrType = { kind: "dyn" };
const expressions: IrExpr[] = [
  { kind: "boolLit", value: true, type: booleanType, loc: location },
  { kind: "strLit", value: "native", type: stringType, loc: location },
];
expressions.forEach((value, index) => {
  if (value.type.kind === "string") {
    expressions[index] = { kind: "dynFrom", value, type: dynType, loc: value.loc };
  } else {
    expressions[index] = { kind: "logical", op: "&&", left: value, right: value, type: booleanType, loc: value.loc };
  }
});
console.log(expressions.map((value) => value.kind).join(","));
const initial: IrExpr = { kind: "boolLit", value: true, type: booleanType, loc: location };
const logical = expressions.reduce<IrExpr>((left, right) => ({
  kind: "logical", op: "&&", left, right, type: booleanType, loc: location,
}), initial);
console.log(logical.kind, logical.kind === "logical" && logical.left.kind);
const getters = [{ name: "one", fn: initial }, { name: "two", fn: initial }];
const withGetters = getters.reduceRight<IrExpr>((value, getter) => ({
  kind: "recordLit", fields: [
    { name: getter.name, value },
    { name: "getter", value: getter.fn },
  ], type: { kind: "record", shapeId: "fixture" }, loc: location,
}), initial);
console.log(withGetters.kind, withGetters.kind === "recordLit" && withGetters.fields.length);

import { readFileSync } from "node:fs";
import { deserializeModule } from "../../../packages/compiler/src/ir/serialize.js";
import { analyzeIntegerRanges } from "../../../packages/compiler/src/ir/integer-ranges.js";
import { findInitializerBindings, withInitializerBindings } from "../../../packages/compiler/src/ir/initializer-bindings.js";
import { everyStmtList } from "../../../packages/compiler/src/ir/traverse.js";
import { F64, type IrExpr, type IrFunction, type IrStmt } from "../../../packages/compiler/src/ir/ir.js";

interface Row { kind: string; start: number; present: boolean; min: number | null; max: number | null }
function inspect(fn: IrFunction): Row[] {
  const ranges = analyzeIntegerRanges(fn);
  const rows: Row[] = [];
  everyStmtList(fn.body, { stmt: () => true, expr: (expr) => {
    const range = ranges.get(expr);
    rows.push({ kind: expr.kind, start: expr.loc.start, present: ranges.has(expr), min: range?.min ?? null, max: range?.max ?? null });
    return true;
  } });
  return rows;
}

if (process.argv[2] === "shared") {
  const loc = { file: "shared.ts", start: 0, end: 1 };
  const shared: IrExpr = { kind: "varRef", localId: "x", type: F64, loc };
  const num = (value: number): IrExpr => ({ kind: "numLit", value, type: F64, loc });
  const assign = (value: IrExpr): IrStmt => ({ kind: "assign", localId: "x", value, loc });
  const fn: IrFunction = {
    name: "shared", params: [], locals: [{ id: "x", name: "x", type: F64, mutable: true }], returnType: F64, loc,
    body: [assign(num(1)), { kind: "exprStmt", expr: shared, loc }, assign(num(8)), { kind: "return", value: shared, loc }],
  };
  console.log(JSON.stringify(inspect(fn)));
  // The same reference later appears under an opaque call. Its earlier
  // proof must become unknown, including through a fresh union wrapper.
  fn.body.push({ kind: "return", value: { kind: "call", callee: "opaque", args: [shared], type: F64, loc }, loc });
  console.log(JSON.stringify(inspect(fn)));
  const distinct: IrExpr = { kind: "varRef", localId: "x", type: F64, loc };
  fn.body = [assign(num(2)), { kind: "exprStmt", expr: shared, loc }, assign(num(9)), { kind: "return", value: distinct, loc }];
  console.log(JSON.stringify(inspect(fn)));
  // NaN is intentionally forbidden by the wire serializer. Exercise it
  // directly so the native analysis still covers its conservative result.
  fn.body = [{ kind: "exprStmt", expr: num(NaN), loc }];
  console.log(JSON.stringify(inspect(fn)));
} else {
  const mod = deserializeModule(readFileSync(process.argv[2]!, "utf8"));
  const bindings = findInitializerBindings(mod);
  console.log(JSON.stringify(mod.functions.map((fn) => ({ name: fn.name, ranges: inspect(withInitializerBindings(fn, bindings.get(fn.name) ?? [])) }))));
}

import { expect, test } from "vitest";
import { BOOL, F64, VOID, type IrExpr, type IrFunction, type IrStmt } from "../../ir/ir.js";
import { findIntegerViews } from "./integer-views.js";

const loc = { file: "integer-views.ts", start: 0, end: 0 };
const num = (value: number): IrExpr => ({ kind: "numLit", value, type: F64, loc });
const ref = (localId: string): IrExpr => ({ kind: "varRef", localId, type: F64, loc });
const view = (localId: string): IrStmt => ({
  kind: "exprStmt",
  expr: { kind: "bin", op: "|", left: ref(localId), right: num(0), type: F64, loc },
  loc,
});
function fixture(): IrFunction {
  return {
    name: "values",
    params: [{ localId: "input", name: "input", type: F64 }],
    returnType: VOID,
    loc,
    locals: ["input", "state", "captured", "boxed", "tdz", "unused", "implicit"].map((id) => ({
      id,
      name: id,
      type: F64,
      mutable: true,
      ...(id === "boxed" ? { boxed: true as const } : {}),
      ...(id === "tdz" ? { tdz: true as const } : {}),
    })),
    captures: [{ localId: "captured", name: "captured", type: F64 }],
    body: [
      ...["state", "captured", "boxed", "tdz", "unused"].map((localId): IrStmt => ({
        kind: "varDecl",
        localId,
        init: num(-0),
        loc,
      })),
      {
        kind: "while",
        cond: { kind: "boolLit", value: false, type: BOOL, loc },
        body: ["input", "state", "captured", "boxed", "tdz", "implicit"].map(view),
        loc,
      },
    ],
  };
}

test("selects computed integer views without assuming the original number is integral", () => {
  expect([...findIntegerViews(fixture())].sort()).toEqual(["input", "state"]);
  expect(findIntegerViews({ ...fixture(), async: true }).size).toBe(0);
  const straight = fixture();
  straight.body = [view("input")];
  expect(findIntegerViews(straight).size).toBe(0);
});

test("excludes locals whose values are supplied by iteration or specialized induction", () => {
  const fn = fixture();
  fn.body.push({
    kind: "forOf",
    localId: "state",
    iterable: { kind: "arrayLit", elems: [num(1.5)], type: { kind: "array", elem: F64 }, loc },
    body: [],
    loc,
  });
  fn.body.push({
    kind: "for",
    init: { kind: "varDecl", localId: "input", init: num(0), loc },
    cond: null,
    update: null,
    body: [],
    loc,
  });
  expect(findIntegerViews(fn).size).toBe(0);
});

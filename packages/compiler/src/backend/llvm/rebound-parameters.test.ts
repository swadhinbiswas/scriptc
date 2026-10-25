import { expect, test } from "vitest";
import { F64, type IrExpr, type IrFunction, type IrStmt, type IrType } from "../../ir/ir.js";
import { findReboundParameters } from "./rebound-parameters.js";

const loc = { file: "rebound.ts", start: 0, end: 0 };
const NODE: IrType = { kind: "object", className: "Node" };
const ref = (localId: string): IrExpr => ({ kind: "varRef", localId, type: NODE, loc });
const assign = (localId: string, value: IrExpr): IrStmt => ({
  kind: "assign",
  localId,
  value,
  loc,
});

function fn(body: IrStmt[], params: { id: string; type?: IrType }[]): IrFunction {
  return {
    name: "work",
    params: params.map((p) => ({ localId: p.id, name: p.id, type: p.type ?? NODE })),
    locals: params.map((p) => ({ id: p.id, name: p.id, type: p.type ?? NODE, mutable: true })),
    body,
    returnType: F64,
    loc,
  };
}

const plain = (type: IrType): boolean => type.kind === "object";

test("statement rebinding of reference parameters keeps the borrowed convention", () => {
  const body = [
    assign("a", ref("b")),
    { kind: "if", cond: ref("a"), then: [assign("b", ref("a"))], else_: null, loc } as IrStmt,
  ];
  const f = fn(body, [{ id: "a" }, { id: "b" }, { id: "untouched" }]);
  expect(findReboundParameters(f, plain, new Set())).toEqual(new Set(["a", "b"]));
  // Parameters already borrowed as walks are left to the walk analysis.
  expect(findReboundParameters(f, plain, new Set(["a"]))).toEqual(new Set(["b"]));
});

test("expression writes, scalar types, captures and suspension keep the owned parameter", () => {
  const sequence: IrExpr = {
    kind: "seqExpr",
    stmts: [assign("a", ref("b"))],
    result: { kind: "numLit", value: 0, type: F64, loc },
    type: F64,
    loc,
  };
  const inExpression = fn([{ kind: "exprStmt", expr: sequence, loc }], [{ id: "a" }, { id: "b" }]);
  expect(findReboundParameters(inExpression, plain, new Set()).size).toBe(0);
  const scalar = fn(
    [assign("n", { kind: "numLit", value: 1, type: F64, loc })],
    [{ id: "n", type: F64 }],
  );
  expect(findReboundParameters(scalar, plain, new Set()).size).toBe(0);
  const captured = fn(
    [
      assign("a", ref("b")),
      {
        kind: "exprStmt",
        expr: {
          kind: "closure",
          name: "inner",
          captures: ["a"],
          type: F64,
          loc,
        } as unknown as IrExpr,
        loc,
      },
    ],
    [{ id: "a" }, { id: "b" }],
  );
  expect(findReboundParameters(captured, plain, new Set()).size).toBe(0);
  const suspending: IrFunction = {
    ...fn([assign("a", ref("b"))], [{ id: "a" }, { id: "b" }]),
    async: true,
  };
  expect(findReboundParameters(suspending, plain, new Set()).size).toBe(0);
});

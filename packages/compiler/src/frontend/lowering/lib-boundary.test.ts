import { expect, test } from "vitest";
import { DYN, F64, STRING, VOID, type IrExpr, type IrStmt, type IrType } from "../../ir/ir.js";
import { enforceLibBoundary } from "./lib-boundary.js";
import { PoisonError, type Lowerer } from "./lowerer.js";
import type { ScrDiagnostic } from "../../diagnostics/diagnostic.js";

const loc = { file: "boundary.ts", start: 0, end: 1 };
const variable = (type: IrType): IrExpr => ({ kind: "varRef", localId: "value", type, loc });
function context() {
  const diagnostics: ScrDiagnostic[] = [];
  const lowerer = {
    jsonSafe: (type: IrType) => type.kind === "string" || type.kind === "f64",
    fmt: (type: IrType) => type.kind,
    pushDiag: (diagnostic: ScrDiagnostic) => {
      diagnostics.push(diagnostic);
    },
  } as unknown as Lowerer;
  return { lowerer, diagnostics };
}

test("coerces nested expressions in place and keeps repeat visits idempotent", () => {
  const { lowerer, diagnostics } = context();
  const conversion: IrExpr = {
    kind: "strIntrinsic",
    method: "toUpperCase",
    receiver: variable(DYN),
    args: [],
    type: STRING,
    loc,
  };
  const call: IrExpr = {
    kind: "callValue",
    callee: variable({ kind: "func", params: [STRING], ret: VOID }),
    args: [variable(DYN)],
    type: VOID,
    loc,
  };
  const statements: IrStmt[] = [
    {
      kind: "block",
      loc,
      body: [
        { kind: "exprStmt", expr: conversion, loc },
        {
          kind: "exprStmt",
          loc,
          expr: {
            kind: "seqExpr",
            type: F64,
            loc,
            stmts: [{ kind: "exprStmt", expr: call, loc }],
            result: { kind: "numLit", value: 1, type: F64, loc },
          },
        },
      ],
    },
  ];
  enforceLibBoundary(lowerer, statements);
  expect(conversion.receiver).toMatchObject({ kind: "dynCheck", type: STRING });
  expect(call.args[0]).toMatchObject({ kind: "dynCheck", type: STRING });
  const before = JSON.stringify(statements);
  enforceLibBoundary(lowerer, statements);
  expect(JSON.stringify(statements)).toBe(before);
  expect(diagnostics).toEqual([]);
});

test("keeps child-first diagnostics inside nested statements", () => {
  const { lowerer, diagnostics } = context();
  const badCall: IrExpr = { kind: "callValue", callee: variable(DYN), args: [], type: VOID, loc };
  const statement: IrStmt = {
    kind: "exprStmt",
    loc,
    expr: {
      kind: "strIntrinsic",
      method: "toUpperCase",
      receiver: badCall,
      args: [],
      type: STRING,
      loc,
    },
  };
  expect(() => enforceLibBoundary(lowerer, statement)).toThrow(PoisonError);
  expect(diagnostics).toHaveLength(1);
  expect(diagnostics[0]).toMatchObject({ code: "SC1100", loc });
  expect(diagnostics[0]!.message).toContain("calling 'dyn' values");
});

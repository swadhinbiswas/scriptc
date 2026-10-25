import { dynUndefinedExpr, varRef } from "../../ir/build.js";
import { BOOL, DYN, STRING, type IrExpr, type IrLocal, type SrcLoc } from "../../ir/ir.js";
import type { Lowerer } from "./lowerer.js";

/** The iterator and captured next method stay fixed for this consumption.
 * Custom methods keep emitted dispatch, including native class accessors. */
export function iteratorCanStep(iterator: IrExpr, next: IrExpr, loc: SrcLoc): IrExpr {
  return { kind: "libCall", fn: "dyn.iteratorCanStep", args: [iterator, next], type: BOOL, loc };
}

/** Consume a value and update done without exposing a builtin result object.
 * The fallback reads done before value and never reads value on completion.
 * Callers retain their existing IteratorClose and abrupt-completion rules. */
export function iteratorValue(
  lowerer: Lowerer,
  iterator: IrExpr,
  next: IrExpr,
  fast: IrExpr,
  done: IrLocal,
  loc: SrcLoc,
  calleeName: string,
): IrExpr {
  const native = lowerer.declareHiddenLocal("%nativeIteratorValue", DYN);
  const result = lowerer.declareHiddenLocal("%iteratorResult", DYN);
  const get = (key: string): IrExpr => ({
    kind: "dynKeyGet",
    value: varRef(result.id, DYN, loc),
    key: { kind: "strLit", value: key, type: STRING, loc },
    type: DYN,
    loc,
  });
  return {
    kind: "ternary",
    cond: fast,
    type: DYN,
    loc,
    then: {
      kind: "seqExpr",
      type: DYN,
      loc,
      stmts: [
        {
          kind: "varDecl",
          localId: native.id,
          init: { kind: "libCall", fn: "dyn.iteratorStep", args: [iterator], type: DYN, loc },
          loc,
        },
        {
          kind: "assign",
          localId: done.id,
          value: { kind: "libCall", fn: "dyn.iteratorStepDone", args: [iterator], type: BOOL, loc },
          loc,
        },
      ],
      result: varRef(native.id, DYN, loc),
    },
    else_: {
      kind: "seqExpr",
      type: DYN,
      loc,
      stmts: [
        {
          kind: "varDecl",
          localId: result.id,
          init: {
            kind: "libCall",
            fn: "dyn.iteratorResult",
            args: [
              {
                kind: "dynCall",
                callee: next,
                receiver: iterator,
                calleeName,
                args: [],
                type: DYN,
                loc,
              },
            ],
            type: DYN,
            loc,
          },
          loc,
        },
        {
          kind: "assign",
          localId: done.id,
          value: { kind: "dynTest", test: "truthy", value: get("done"), type: BOOL, loc },
          loc,
        },
      ],
      result: {
        kind: "ternary",
        cond: varRef(done.id, BOOL, loc),
        then: dynUndefinedExpr(loc),
        else_: get("value"),
        type: DYN,
        loc,
      },
    },
  };
}

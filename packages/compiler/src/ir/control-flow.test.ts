import { describe, expect, test } from "vitest";
import { boolLit, numLit, strLit, varRef } from "./build.js";
import { alwaysReturns, containsBreak } from "./control-flow.js";
import { BOOL, F64, STRING, VOID, type IrExpr, type IrStmt, type IrUnionDef } from "./ir.js";

const loc = { file: "control-flow.ts", start: 0, end: 1 };
const ret: IrStmt = { kind: "return", value: numLit(0, loc), loc };
const stop: IrStmt = { kind: "break", loc };
const empty: IrStmt = { kind: "block", body: [], loc };
const unions = new Map<string, IrUnionDef>([["pair", { id: "pair", arms: [STRING, F64] }]]);
const branch = (then: IrStmt[], else_: IrStmt[] | null): IrStmt => ({
  kind: "if",
  cond: varRef("condition", BOOL, loc),
  then,
  else_,
  loc,
});
const loop = (body: IrStmt[]): IrStmt => ({ kind: "while", cond: boolLit(true, loc), body, loc });
const guarded = (
  tryBody: IrStmt[],
  catchBody: IrStmt[] | null,
  finallyBody: IrStmt[] | null,
): IrStmt => ({ kind: "tryCatch", tryBody, catchBody, finallyBody, catchLocalId: null, loc });
const disc: IrExpr = {
  kind: "unionDisc",
  unionId: "pair",
  field: "kind",
  value: varRef("value", { kind: "union", unionId: "pair" }, loc),
  type: STRING,
  loc,
};
function switchOf(cases: { test: IrExpr | null; body: IrStmt[] }[], discriminator = disc): IrStmt {
  return { kind: "switch", disc: discriminator, cases, loc };
}

describe("return analysis", () => {
  test("sequences terminate at a returning block or both conditional branches", () => {
    expect(alwaysReturns([], unions)).toBe(false);
    expect(alwaysReturns([empty, branch([ret], null)], unions)).toBe(false);
    expect(alwaysReturns([empty, branch([ret], [ret])], unions)).toBe(true);
    expect(alwaysReturns([{ kind: "block", body: [empty, ret], loc }], unions)).toBe(true);
  });

  test("throws, rethrows, fences, and process exit terminate", () => {
    const terminating: IrStmt[] = [
      { kind: "throw", value: strLit("failure", loc), loc },
      { kind: "rethrow", localId: "caught", loc },
      { kind: "runtimeFence", code: "SC1090", message: "unsupported", loc },
      {
        kind: "exprStmt",
        expr: { kind: "libCall", fn: "process.exit", args: [numLit(1, loc)], type: VOID, loc },
        loc,
      },
    ];
    for (const statement of terminating) expect(alwaysReturns([statement], unions)).toBe(true);
    expect(alwaysReturns([{ kind: "exprStmt", expr: numLit(1, loc), loc }], unions)).toBe(false);
  });

  test("only literal unconditional loops establish termination", () => {
    expect(alwaysReturns([loop([])], unions)).toBe(true);
    expect(alwaysReturns([loop([stop])], unions)).toBe(false);
    expect(
      alwaysReturns([{ kind: "while", cond: varRef("test", BOOL, loc), body: [ret], loc }], unions),
    ).toBe(false);
    expect(
      alwaysReturns([{ kind: "for", init: null, cond: null, update: null, body: [], loc }], unions),
    ).toBe(true);
    expect(
      alwaysReturns(
        [{ kind: "for", init: null, cond: boolLit(false, loc), update: null, body: [], loc }],
        unions,
      ),
    ).toBe(false);
  });

  test("do loops execute their returning body at least once", () => {
    expect(
      alwaysReturns([{ kind: "doWhile", body: [ret], cond: boolLit(false, loc), loc }], unions),
    ).toBe(true);
    expect(
      alwaysReturns([{ kind: "doWhile", body: [], cond: boolLit(false, loc), loc }], unions),
    ).toBe(false);
    expect(
      alwaysReturns([{ kind: "doWhile", body: [stop], cond: boolLit(true, loc), loc }], unions),
    ).toBe(false);
  });

  test("catch fallthrough is accounted for and terminating finally takes precedence", () => {
    expect(alwaysReturns([guarded([ret], null, [])], unions)).toBe(true);
    expect(alwaysReturns([guarded([ret], [], null)], unions)).toBe(false);
    expect(alwaysReturns([guarded([ret], [ret], null)], unions)).toBe(true);
    expect(alwaysReturns([guarded([], [], [ret])], unions)).toBe(true);
    expect(alwaysReturns([guarded([], [ret], [])], unions)).toBe(false);
  });
});

describe("switch coverage", () => {
  test("fallthrough suffixes must terminate from every entry", () => {
    const cases = [
      { test: strLit("left", loc), body: [] },
      { test: null, body: [ret] },
    ];
    expect(alwaysReturns([switchOf(cases)], unions)).toBe(true);
    cases[1]!.body = [];
    expect(alwaysReturns([switchOf(cases)], unions)).toBe(false);
    cases[0]!.body = [ret];
    expect(alwaysReturns([switchOf(cases)], unions)).toBe(false);
  });

  test("an exhaustive discriminant needs distinct literals and a known union", () => {
    const cases = [
      { test: strLit("left", loc), body: [ret] },
      { test: strLit("right", loc), body: [ret] },
    ];
    expect(alwaysReturns([switchOf(cases)], unions)).toBe(true);
    expect(alwaysReturns([switchOf(cases)], new Map())).toBe(false);
    expect(alwaysReturns([switchOf(cases.slice(0, 1))], unions)).toBe(false);
    expect(alwaysReturns([switchOf([cases[0]!, cases[0]!])], unions)).toBe(false);
    expect(alwaysReturns([switchOf(cases, varRef("text", STRING, loc))], unions)).toBe(false);
  });

  test("different literal kinds remain distinct and expression tests are not exhaustive", () => {
    const cases = [
      { test: numLit(1, loc), body: [ret] },
      { test: strLit("1", loc), body: [ret] },
    ];
    expect(alwaysReturns([switchOf(cases)], unions)).toBe(true);
    expect(
      alwaysReturns([switchOf([{ test: boolLit(true, loc), body: [ret] }, cases[0]!])], unions),
    ).toBe(true);
    expect(
      alwaysReturns(
        [switchOf([{ test: varRef("key", STRING, loc), body: [ret] }, cases[0]!])],
        unions,
      ),
    ).toBe(false);
  });

  test("a switch-owned break prevents an all-paths-return claim", () => {
    const cases = [
      { test: strLit("left", loc), body: [branch([stop], [ret])] },
      { test: null, body: [ret] },
    ];
    expect(alwaysReturns([switchOf(cases)], unions)).toBe(false);
    cases[0]!.body = [loop([stop]), ret];
    expect(alwaysReturns([switchOf(cases)], unions)).toBe(true);
  });
});

describe("break ownership", () => {
  test("blocks and either conditional branch propagate breaks", () => {
    expect(containsBreak([empty, branch([], [stop])])).toBe(true);
    expect(containsBreak([{ kind: "block", body: [stop], loc }])).toBe(true);
    expect(containsBreak([branch([ret], [ret])])).toBe(false);
  });

  test("try, catch, and finally bodies preserve the enclosing break target", () => {
    expect(containsBreak([guarded([stop], null, null)])).toBe(true);
    expect(containsBreak([guarded([], [stop], null)])).toBe(true);
    expect(containsBreak([guarded([], null, [stop])])).toBe(true);
    expect(containsBreak([guarded([], null, null)])).toBe(false);
  });

  test("nested loops and switches own their breaks", () => {
    const nested: IrStmt[] = [
      loop([stop]),
      { kind: "for", init: null, cond: null, update: null, body: [stop], loc },
      { kind: "doWhile", body: [stop], cond: boolLit(false, loc), loc },
      switchOf([{ test: null, body: [stop] }]),
    ];
    expect(containsBreak(nested)).toBe(false);
    expect(alwaysReturns([loop(nested)], unions)).toBe(true);
  });
});

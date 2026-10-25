import { expect, test } from "vitest";
import { BOOL, F64, VOID, type IrExpr, type IrStmt } from "../ir/ir.js";
import { loopTestsEveryIteration } from "./loop-polls.js";

const loc = { file: "loops.ts", start: 0, end: 1 };
const call = (callee: string): IrExpr => ({ kind: "call", callee, args: [], type: F64, loc });
const stmt = (expr: IrExpr): IrStmt => ({ kind: "exprStmt", expr, loc });
const yes: IrExpr = { kind: "boolLit", value: true, type: BOOL, loc };
const tested = (e: IrExpr): boolean => e.kind === "call" && e.callee === "throws";
const whileLoop = (body: IrStmt[], cond: IrExpr = yes, labels?: string[]): IrStmt => ({
  kind: "while",
  cond,
  body,
  loc,
  ...(labels ? { labels } : {}),
});
const answer = (loop: IrStmt): boolean =>
  loopTestsEveryIteration(loop as Parameters<typeof loopTestsEveryIteration>[0], tested);
const ifThen = (body: IrStmt[]): IrStmt => ({
  kind: "if",
  cond: yes,
  then: body,
  else_: null,
  loc,
});
const sum = (left: IrExpr, right: IrExpr): IrExpr => ({
  kind: "bin",
  op: "+",
  left,
  right,
  type: F64,
  loc,
});

test("an unconditional tested call in the body or condition replaces the poll", () => {
  expect(answer(whileLoop([stmt(call("throws"))]))).toBe(true);
  expect(answer(whileLoop([stmt(sum(call("pure"), call("throws")))]))).toBe(true);
  expect(answer(whileLoop([], { kind: "toBool", operand: call("throws"), type: BOOL, loc }))).toBe(
    true,
  );
  // Untested calls and calls behind a condition or short circuit do not.
  expect(answer(whileLoop([stmt(call("pure"))]))).toBe(false);
  expect(answer(whileLoop([ifThen([stmt(call("throws"))])]))).toBe(false);
  const shortCircuit: IrExpr = {
    kind: "logical",
    op: "&&",
    left: yes,
    right: call("throws"),
    type: BOOL,
    loc,
  };
  expect(answer(whileLoop([stmt(shortCircuit)]))).toBe(false);
});

test("a continue before the tested call keeps the poll", () => {
  const skip: IrStmt = { kind: "continue", loc };
  expect(answer(whileLoop([ifThen([skip]), stmt(call("throws"))]))).toBe(false);
  // After the call, or bound to a nested loop, a continue is harmless.
  expect(answer(whileLoop([stmt(call("throws")), ifThen([skip])]))).toBe(true);
  expect(answer(whileLoop([whileLoop([skip]), stmt(call("throws"))]))).toBe(true);
  // A labeled continue out of a nested loop still skips this iteration.
  const labeled: IrStmt = { kind: "continue", label: "outer", loc };
  expect(answer(whileLoop([whileLoop([labeled]), stmt(call("throws"))], yes, ["outer"]))).toBe(
    false,
  );
});

test("for updates and do-while conditions run after every continue", () => {
  const skip: IrStmt = { kind: "continue", loc };
  const forLoop: IrStmt = {
    kind: "for",
    init: null,
    cond: null,
    update: stmt(call("throws")),
    body: [ifThen([skip])],
    loc,
  };
  expect(answer(forLoop)).toBe(true);
  const doWhile: IrStmt = {
    kind: "doWhile",
    body: [ifThen([skip])],
    cond: { kind: "toBool", operand: call("throws"), type: BOOL, loc },
    loc,
  };
  expect(answer(doWhile)).toBe(true);
  const forOf: IrStmt = {
    kind: "forOf",
    localId: "x",
    iterable: { kind: "varRef", localId: "xs", type: { kind: "array", elem: F64 }, loc },
    body: [stmt({ kind: "call", callee: "throws", args: [], type: VOID, loc })],
    loc,
  } as IrStmt;
  expect(answer(forOf)).toBe(true);
});

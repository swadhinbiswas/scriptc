import { expect, test } from "vitest";
import {
  BOOL,
  DYN,
  F64,
  STRING,
  VOID,
  type IrClassDef,
  type IrExpr,
  type IrFunction,
  type IrStmt,
} from "../../ir/ir.js";
import { ReferenceEffects, VirtualTargets, preservesRegexInputs } from "./reference-effects.js";

const loc = { file: "effects.ts", start: 0, end: 0 };
const number: IrExpr = { kind: "numLit", value: 1, type: F64, loc };
const text: IrExpr = { kind: "strLit", value: "text", type: STRING, loc };
const call = (callee: string, args: IrExpr[] = []): IrExpr => ({
  kind: "call",
  callee,
  args,
  type: F64,
  loc,
});
function fn(name: string, expressions: IrExpr[] = []): IrFunction {
  return {
    name,
    params: [],
    locals: [],
    body: expressions.map((expr) => ({ kind: "exprStmt", expr, loc })),
    returnType: VOID,
    loc,
  };
}
function effects(functions: IrFunction[]): ReferenceEffects {
  return new ReferenceEffects(new Map(functions.map((f) => [f.name, f])), () => false);
}

test("reference preservation allows recursive scalar work but propagates a reference write", () => {
  const first = fn("first", [call("second")]),
    second = fn("second", [call("first")]);
  second.body.push({ kind: "assign", localId: "scalar", value: number, loc });
  const safe = effects([first, second]);
  expect(safe.functions).toEqual(new Set(["first", "second"]));
  expect(safe.preserves(call("first"))).toBe(true);
  second.body.push({ kind: "assign", localId: "owner", value: text, loc });
  expect(effects([first, second]).functions.size).toBe(0);
});

test("later argument statements and indirect calls remain part of the lifetime proof", () => {
  const summary = effects([fn("read")]);
  const assignment: IrExpr = {
    kind: "assignExpr",
    localId: "owner",
    value: text,
    type: STRING,
    loc,
  };
  const sequence: IrExpr = {
    kind: "seqExpr",
    stmts: [{ kind: "assign", localId: "owner", value: text, loc }],
    result: number,
    type: F64,
    loc,
  };
  expect(summary.preserves(call("read", [assignment]))).toBe(false);
  expect(summary.preserves(call("read", [sequence]))).toBe(false);
  expect(summary.preserves(call("unknown"))).toBe(false);
  expect(summary.preserves(call("read", [number]))).toBe(true);
});

test("suspending bodies and environments cannot inherit synchronous guarantees", () => {
  const async = fn("async");
  async.async = true;
  const capture = fn("capture");
  capture.captures = [];
  const callers = [fn("a", [call("async")]), fn("b", [call("capture")])];
  expect(effects([async, capture, ...callers]).functions.size).toBe(0);
  expect(preservesRegexInputs("futureMethod")).toBe(false);
  expect(preservesRegexInputs("matchAllInto")).toBe(false);
});

test("numeric byte operations preserve owners but argument replacement and callbacks do not", () => {
  const bytes: IrExpr = {
    kind: "varRef",
    localId: "bytes",
    type: { kind: "bytes", elem: "u8" },
    loc,
  };
  const read: IrExpr = {
    kind: "bytesIntrinsic",
    method: "dvGetUint32",
    receiver: bytes,
    args: [number],
    type: F64,
    loc,
  };
  const write: IrExpr = {
    kind: "bytesIntrinsic",
    method: "dvSetUint32",
    receiver: bytes,
    args: [number, read],
    type: VOID,
    loc,
  };
  const summary = effects([fn("read", [read]), fn("write", [write])]);
  expect(summary.functions).toEqual(new Set(["read", "write"]));
  expect(summary.preserves(write)).toBe(true);
  const replace: IrExpr = {
    kind: "assignExpr",
    localId: "bytes",
    value: bytes,
    type: bytes.type,
    loc,
  };
  expect(summary.preserves({ ...read, receiver: replace })).toBe(false);
  expect(summary.preserves({ ...read, args: [call("unknown")] })).toBe(false);
});

test("long call graphs use a worklist and facts are rebuilt for changed bodies", () => {
  const functions = Array.from({ length: 2000 }, (_, i) =>
    fn(`f${i}`, i === 1999 ? [] : [call(`f${i + 1}`)]),
  );
  expect(effects(functions).functions.size).toBe(functions.length);
  const write: IrStmt = { kind: "assign", localId: "owner", value: text, loc };
  functions[1999]!.body.push(write);
  expect(effects(functions).functions.size).toBe(0);
});

test("callee-local rebinding preserves caller owners while captures and operand writes do not", () => {
  const helper = fn("select");
  helper.locals.push({ id: "local", name: "local", type: STRING, mutable: true });
  const replace: IrExpr = { kind: "assignExpr", localId: "local", value: text, type: STRING, loc };
  helper.body = [
    { kind: "varDecl", localId: "local", init: text, loc },
    { kind: "assign", localId: "local", value: text, loc },
    { kind: "exprStmt", expr: replace, loc },
  ];
  const caller = fn("caller", [call("select")]);
  const summary = effects([helper, caller]);
  expect(summary.functions).toEqual(new Set(["select", "caller"]));
  expect(summary.preserves(call("select", [replace]))).toBe(false);
  helper.locals[0]!.boxed = true;
  expect(effects([helper, caller]).functions.size).toBe(0);
});

test("checked error paths preserve owners but message coercion and mutation remain barriers", () => {
  const guarded = fn("guarded");
  const error: IrExpr = {
    kind: "libCall",
    fn: "error.new",
    args: [text],
    type: { kind: "object", className: "%TypeError" },
    loc,
  };
  guarded.body = [{ kind: "throw", value: error, loc }];
  expect(effects([guarded]).preserves(call("guarded"))).toBe(true);
  error.fn = "error.newOptions";
  expect(effects([guarded]).preserves(call("guarded"))).toBe(false);
  error.fn = "error.new";
  error.args = [{ kind: "assignExpr", localId: "global", value: text, type: STRING, loc }];
  expect(effects([guarded]).preserves(call("guarded"))).toBe(false);
});

test("checked scalar tests preserve owners while materializing reads stay conservative", () => {
  const value: IrExpr = { kind: "varRef", localId: "value", type: DYN, loc };
  const summary = effects([]);
  for (const test of ["truthy", "nullish", "string", "bytes", "buffer", "promise"] as const) {
    expect(summary.preserves({ kind: "dynTest", value, test, type: BOOL, loc }), test).toBe(true);
  }
  for (const test of ["object", "array", "function", "error"] as const) {
    expect(summary.preserves({ kind: "dynTest", value, test, type: BOOL, loc }), test).toBe(false);
  }
  expect(
    summary.preserves({ kind: "dynScalarEq", left: value, right: text, type: BOOL, loc }),
  ).toBe(true);
  expect(summary.preserves({ kind: "dynKeyGet", value, key: text, type: DYN, loc })).toBe(false);
  const replace: IrExpr = { kind: "assignExpr", localId: "value", value, type: DYN, loc };
  expect(
    summary.preserves({ kind: "dynScalarEq", left: value, right: replace, type: BOOL, loc }),
  ).toBe(false);
});

test("nullish fallbacks and Math calls preserve references; their operands still count", () => {
  const min: IrExpr = { kind: "libCall", fn: "math.min", args: [number, number], type: F64, loc };
  const fallback = (right: IrExpr): IrExpr => ({
    kind: "nullish",
    left: number,
    right,
    type: F64,
    loc,
  });
  expect(effects([fn("pure", [fallback(min)])]).functions).toEqual(new Set(["pure"]));
  const write: IrExpr = { kind: "assignExpr", localId: "owner", value: text, type: STRING, loc };
  const summary = effects([fn("read")]);
  expect(summary.preserves(fallback(write))).toBe(false);
  expect(summary.preserves(fallback(call("read")))).toBe(true);
});

test("virtual calls preserve references only when every reachable override does", () => {
  const cls = (name: string, methods: string[], base?: string, extra?: Partial<IrClassDef>) =>
    ({ name, base, fields: [], methods, loc, ...extra }) as IrClassDef;
  const classes = [
    cls("A", ["run", "size"], undefined, { abstractMethods: ["size"] }),
    cls("B", ["size"], "A"),
    cls("C", ["run"], "B"),
    cls("D", [], "A"),
  ];
  const targets = new VirtualTargets(classes);
  expect(targets.targets("A", "run")).toEqual(["%A.run", "%C.run"]);
  // B inherits A.run; only C overrides below it. Abstract slots have no body.
  expect(targets.targets("B", "run")).toEqual(["%A.run", "%C.run"]);
  expect(targets.targets("A", "size")).toEqual(["%B.size"]);
  expect(targets.targets("D", "run")).toEqual(["%A.run"]);
  expect(
    new VirtualTargets([...classes, cls("E", ["run"], "D", { runtime: true })]).targets("A", "run"),
  ).toBe(null);
  const virtual: IrExpr = {
    kind: "virtualCall",
    className: "A",
    method: "run",
    args: [],
    type: F64,
    loc,
  };
  const build = (mutating: boolean) => {
    const functions = [fn("%A.run"), fn("%C.run"), fn("caller", [virtual])];
    if (mutating) functions[1]!.body.push({ kind: "assign", localId: "owner", value: text, loc });
    return new ReferenceEffects(new Map(functions.map((f) => [f.name, f])), () => false, classes);
  };
  expect(build(false).preserves(virtual)).toBe(true);
  expect(build(false).functions.has("caller")).toBe(true);
  expect(build(true).preserves(virtual)).toBe(false);
  expect(build(true).functions.has("caller")).toBe(false);
  // Without class facts a virtual call stays a barrier.
  expect(effects([fn("%A.run")]).preserves(virtual)).toBe(false);
});

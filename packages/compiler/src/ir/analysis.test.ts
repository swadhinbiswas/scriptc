import { expect, test } from "vitest";
import {
  isStableReceiverOperand,
  matchFieldSelfConcat,
  matchStringSelfConcat,
  readsArraySlot,
  unionWideningTags,
} from "./analysis.js";
import {
  BOOL,
  F64,
  NULL_T,
  STRING,
  UNDEFINED_T,
  arrayOf,
  bytesOf,
  type IrExpr,
  type IrLibFn,
  type IrStmt,
} from "./ir.js";

const loc = { file: "analysis.ts", start: 0, end: 0 };
const str = (value: string): IrExpr => ({ kind: "strLit", value, type: STRING, loc });
const ref = (localId: string, type = STRING): IrExpr => ({ kind: "varRef", localId, type, loc });
const concat = (left: IrExpr, right: IrExpr, type = STRING): IrExpr => ({
  kind: "strConcat",
  left,
  right,
  type,
  loc,
});

test("union widening remaps tags without conflating null, undefined, or scalar payloads", () => {
  expect(unionWideningTags([F64, NULL_T], [BOOL, F64, NULL_T, STRING, UNDEFINED_T])).toEqual([
    1, 2,
  ]);
  expect(
    unionWideningTags([NULL_T, STRING, UNDEFINED_T], [F64, NULL_T, STRING, UNDEFINED_T]),
  ).toEqual([1, 2, 3]);
  expect(unionWideningTags([F64, NULL_T], [F64, UNDEFINED_T])).toBeNull();
});

test("union widening preserves record identity and recursive element layouts", () => {
  const node = { kind: "record", shapeId: "node" } as const;
  const other = { kind: "record", shapeId: "other" } as const;
  const children = arrayOf(node);
  expect(unionWideningTags([children, node], [children, NULL_T, node, other])).toEqual([0, 2]);
  expect(unionWideningTags([children], [arrayOf(other), node])).toBeNull();
  expect(unionWideningTags([node], [other])).toBeNull();
});

test("matchStringSelfConcat recognizes the string self-concat", () => {
  const suffix = str("x");
  const target = ref("acc");
  expect(matchStringSelfConcat("acc", concat(target, suffix))).toEqual({ left: target, suffix });
});

test("matchStringSelfConcat takes the operands after a leftmost target as the suffix", () => {
  const target = ref("acc");
  const self = matchStringSelfConcat(
    "acc",
    concat(concat(concat(target, str("x")), str("y")), str("z")),
  );
  expect(self?.left).toBe(target);
  expect(self?.suffix).toMatchObject({
    kind: "strConcat",
    left: { kind: "strConcat", left: { value: "x" }, right: { value: "y" } },
    right: { value: "z" },
  });
});

test("matchStringSelfConcat rejects non-canonical and non-string shapes", () => {
  expect(matchStringSelfConcat("acc", concat(ref("other"), str("x")))).toBeNull();
  expect(matchStringSelfConcat("acc", concat(concat(ref("other"), str("x")), str("y")))).toBeNull();
  expect(matchStringSelfConcat("acc", concat(str("x"), ref("acc")))).toBeNull();
  expect(matchStringSelfConcat("acc", str("x"))).toBeNull();
  expect(matchStringSelfConcat("acc", concat(ref("acc", F64), str("x")))).toBeNull();
  expect(matchStringSelfConcat("acc", concat(ref("acc"), str("x"), F64))).toBeNull();
});

const objectT = { kind: "object", className: "Buf" } as const;
const fieldGet = (obj: string, field = "text", className = "Buf"): IrExpr => ({
  kind: "fieldGet",
  obj: ref(obj, objectT),
  className,
  field,
  type: STRING,
  loc,
});
const fieldSet = (obj: string, value: IrExpr): Extract<IrStmt, { kind: "fieldSet" }> => ({
  kind: "fieldSet",
  obj: ref(obj, objectT),
  className: "Buf",
  field: "text",
  value,
  loc,
});

test("matchFieldSelfConcat recognizes a field append through one local receiver", () => {
  const suffix = str("x");
  expect(matchFieldSelfConcat(fieldSet("o", concat(fieldGet("o"), suffix)))).toBe(suffix);
  const recordT = { kind: "record", shapeId: "r0" } as const;
  const record: Extract<IrStmt, { kind: "recordSet" }> = {
    kind: "recordSet",
    obj: ref("r", recordT),
    shapeId: "r0",
    field: "text",
    value: concat(
      {
        kind: "recordGet",
        obj: ref("r", recordT),
        shapeId: "r0",
        field: "text",
        type: STRING,
        loc,
      },
      suffix,
    ),
    loc,
  };
  expect(matchFieldSelfConcat(record)).toBe(suffix);
});

test("matchFieldSelfConcat rejects other receivers, fields, classes, and prepends", () => {
  expect(matchFieldSelfConcat(fieldSet("o", concat(fieldGet("p"), str("x"))))).toBeNull();
  expect(matchFieldSelfConcat(fieldSet("o", concat(fieldGet("o", "other"), str("x"))))).toBeNull();
  expect(
    matchFieldSelfConcat(fieldSet("o", concat(fieldGet("o", "text", "Base"), str("x")))),
  ).toBeNull();
  expect(matchFieldSelfConcat(fieldSet("o", concat(str("x"), fieldGet("o"))))).toBeNull();
  expect(matchFieldSelfConcat(fieldSet("o", fieldGet("o")))).toBeNull();
});

test("readsArraySlot accepts the element and the hole-reading ternary only", () => {
  const arrT = arrayOf(STRING);
  const get = (arr: string, index: string): IrExpr => ({
    kind: "arrayGet",
    arr: ref(arr, arrT),
    index: ref(index, F64),
    type: STRING,
    loc,
  });
  const operand: IrExpr = {
    kind: "ternary",
    cond: { kind: "boolLit", value: true, type: BOOL, loc },
    then: get("a", "i"),
    else_: str("undefined"),
    type: STRING,
    loc,
  };
  expect(readsArraySlot(get("a", "i"), "a", "i")).toBe(true);
  expect(readsArraySlot(operand, "a", "i")).toBe(true);
  expect(readsArraySlot(get("a", "j"), "a", "i")).toBe(false);
  expect(readsArraySlot(get("b", "i"), "a", "i")).toBe(false);
  expect(readsArraySlot(str("a"), "a", "i")).toBe(false);
});

test("receiver borrowing accepts scalar index updates and stable byte reads", () => {
  const index: IrExpr = {
    kind: "assignExpr",
    localId: "index",
    value: ref("next", F64),
    type: F64,
    loc,
  };
  const read: IrExpr = {
    kind: "bytesIntrinsic",
    method: "get",
    receiver: ref("bytes", bytesOf("u8")),
    args: [index],
    type: F64,
    loc,
  };
  expect(isStableReceiverOperand(index, "values")).toBe(true);
  expect(isStableReceiverOperand(read, "values")).toBe(true);
});

test("receiver borrowing rejects replacement hidden inside numeric or byte indices", () => {
  const type = arrayOf(F64);
  const replace: IrExpr = {
    kind: "assignExpr",
    localId: "values",
    value: ref("replacement", type),
    type,
    loc,
  };
  const index: IrExpr = {
    kind: "ternary",
    cond: { kind: "toBool", operand: replace, type: BOOL, loc },
    then: { kind: "numLit", value: 0, type: F64, loc },
    else_: ref("index", F64),
    type: F64,
    loc,
  };
  const read: IrExpr = {
    kind: "bytesIntrinsic",
    method: "get",
    receiver: ref("bytes", bytesOf("u8")),
    args: [index],
    type: F64,
    loc,
  };
  expect(isStableReceiverOperand(index, "values")).toBe(false);
  expect(isStableReceiverOperand(read, "values")).toBe(false);
});

test("receiver borrowing rejects calls even when nested in arithmetic", () => {
  const call: IrExpr = { kind: "call", callee: "index", args: [], type: F64, loc };
  const index: IrExpr = {
    kind: "bin",
    op: "+",
    left: ref("offset", F64),
    right: call,
    type: F64,
    loc,
  };
  expect(isStableReceiverOperand(index, "values")).toBe(false);
});

const math = (fn: IrLibFn, ...args: IrExpr[]): IrExpr => ({
  kind: "libCall",
  fn,
  args,
  type: F64,
  loc,
});

test("receiver borrowing accepts nested scalar Math operations and scalar index effects", () => {
  const increment: IrExpr = {
    kind: "incDec",
    localId: "index",
    op: "+",
    prefix: false,
    type: F64,
    loc,
  };
  const index = math("math.floor", increment);
  const read: IrExpr = {
    kind: "bytesIntrinsic",
    method: "get",
    receiver: ref("bytes", bytesOf("u8")),
    args: [index],
    type: F64,
    loc,
  };
  const value = math("math.min", math("math.abs", read), math("math.sqrt", ref("limit", F64)));
  expect(isStableReceiverOperand(value, "bytes")).toBe(true);
});

test("a Math wrapper cannot hide a call or receiver replacement in either argument", () => {
  const bytes = bytesOf("u8");
  const replace: IrExpr = {
    kind: "assignExpr",
    localId: "bytes",
    value: ref("other", bytes),
    type: bytes,
    loc,
  };
  const condition: IrExpr = { kind: "toBool", operand: replace, type: BOOL, loc };
  const hidden: IrExpr = {
    kind: "ternary",
    cond: condition,
    then: ref("x", F64),
    else_: ref("y", F64),
    type: F64,
    loc,
  };
  const call: IrExpr = { kind: "call", callee: "replace", args: [], type: F64, loc };
  for (const effect of [hidden, call]) {
    expect(isStableReceiverOperand(math("math.floor", effect), "bytes")).toBe(false);
    expect(
      isStableReceiverOperand(math("math.pow", ref("x", F64), math("math.abs", effect)), "bytes"),
    ).toBe(false);
    expect(isStableReceiverOperand(math("math.min", effect, ref("x", F64)), "bytes")).toBe(false);
  }
});

test("only audited scalar Math lowerings qualify, not reference arguments or other library calls", () => {
  expect(isStableReceiverOperand(math("math.minArr", ref("array", arrayOf(F64))), "bytes")).toBe(
    false,
  );
  expect(isStableReceiverOperand(math("math.random"), "bytes")).toBe(false);
  expect(isStableReceiverOperand(math("num.fromString", str("3")), "bytes")).toBe(false);
  expect(isStableReceiverOperand(math("math.floor", str("3")), "bytes")).toBe(false);
});

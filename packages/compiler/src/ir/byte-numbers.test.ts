import { expect, test } from "vitest";
import {
  F64,
  STRING,
  VOID,
  bytesOf,
  type IrBytesIntrinsicMethod,
  type IrExpr,
  type IrFunction,
} from "./ir.js";
import { byteNumberAccess, byteNumberRange, validByteNumberToken } from "./byte-numbers.js";
import { analyzeIntegerRanges } from "./integer-ranges.js";

const loc = { file: "byte-numbers.ts", start: 0, end: 0 };
const num = (value: number): IrExpr => ({ kind: "numLit", value, type: F64, loc });
const token = (value: string): IrExpr => ({ kind: "strLit", value, type: STRING, loc });
const receiver: IrExpr = { kind: "varRef", localId: "bytes", type: bytesOf("u8"), loc };
function access(method: IrBytesIntrinsicMethod, args: IrExpr[]): IrExpr {
  return {
    kind: "bytesIntrinsic",
    method,
    receiver,
    args,
    type: method.startsWith("dvSet") ? VOID : F64,
    loc,
  };
}

test("standard numeric reads carry exact integer ranges without classifying floats or rounded 64-bit reads", () => {
  const cases: [IrExpr, { min: number; max: number } | null][] = [
    [access("readNum", [token("u32le"), num(0)]), { min: 0, max: 4294967295 }],
    [access("readNum", [token("i16be"), num(0)]), { min: -32768, max: 32767 }],
    [access("readNumVar", [token("ibe"), num(0), num(5)]), { min: -(2 ** 39), max: 2 ** 39 - 1 }],
    [access("readNumVar", [token("ule"), num(0), num(6)]), { min: 0, max: 2 ** 48 - 1 }],
    [access("dvGetUint8", [num(0)]), { min: 0, max: 255 }],
    [access("dvGetInt32", [num(0)]), { min: -(2 ** 31), max: 2 ** 31 - 1 }],
    [access("dvGetBigUint64Number", [num(0)]), null],
    [access("dvGetFloat32", [num(0)]), null],
    [access("readNum", [token("f64le"), num(0)]), null],
    [access("writeNum", [token("u32le"), num(1), num(0)]), null],
  ];
  const fn: IrFunction = {
    name: "f",
    params: [],
    locals: [],
    returnType: VOID,
    loc,
    body: cases.map(([expr]) => ({ kind: "exprStmt", expr, loc })),
  };
  const ranges = analyzeIntegerRanges(fn);
  for (const [expr, expected] of cases) expect(ranges.get(expr)).toEqual(expected);
});

test("variable widths require a valid literal and fixed tokens cannot inherit prototype entries", () => {
  for (const width of [0, 7, 1.5, NaN, Infinity])
    expect(byteNumberAccess(access("readNumVar", [token("ule"), num(0), num(width)]))).toBeNull();
  for (const value of ["toString", "constructor", "__proto__", "u8le", "u64le", "f32", "u32xx"]) {
    expect(validByteNumberToken("readNum", value)).toBe(false);
    expect(byteNumberAccess(access("readNum", [token(value), num(0)]))).toBeNull();
  }
  const dynamic: IrExpr = { kind: "varRef", localId: "width", type: F64, loc };
  expect(byteNumberAccess(access("readNumVar", [token("ule"), num(0), dynamic]))).toBeNull();
  expect(byteNumberRange({ width: 8, signed: true, floating: false })).toBeNull();
});

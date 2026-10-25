import { expect, test } from "vitest";
import {
  AstDecodeError,
  AstMsgpackReader,
  astBounds,
  astI32,
  astU32,
  decodeAstString,
} from "./ast-bytes.js";

test("reads little-endian signed and unsigned words without losing the high bit", () => {
  const bytes = Uint8Array.from([1, 0x78, 0x56, 0x34, 0x12, 0xff, 0xff, 0xff, 0xff, 0, 0, 0, 0x80]);
  expect(astU32(bytes, 1)).toBe(0x12345678);
  expect(astU32(bytes, 5)).toBe(0xffffffff);
  expect(astI32(bytes, 5)).toBe(-1);
  expect(astI32(bytes, 9)).toBe(-2147483648);
});

test.each([-1, 0.5, NaN, Infinity, 2 ** 53])("bounds reject offset %s", (offset) => {
  expect(() => astU32(new Uint8Array(4), offset)).toThrow(AstDecodeError);
  expect(() => astBounds(new Uint8Array(4), 0, offset)).toThrow(AstDecodeError);
});

test("zero-length reads accept the end but words cannot cross it", () => {
  astBounds(new Uint8Array(4), 4, 0);
  expect(() => astU32(new Uint8Array(4), 1)).toThrow("byte range");
  expect(() => astBounds(new Uint8Array(4), 5, 0)).toThrow("byte range");
});

test("WTF-8 preserves every lone surrogate and BOM within a string", () => {
  for (let code = 0xd800; code <= 0xdfff; code++) {
    const bytes = Uint8Array.from([
      0xef,
      0xbb,
      0xbf,
      0xed,
      0x80 | ((code >>> 6) & 0x3f),
      0x80 | (code & 0x3f),
      0xef,
      0xbb,
      0xbf,
    ]);
    expect(decodeAstString(bytes, 0, bytes.length)).toBe(
      "\uFEFF" + String.fromCharCode(code) + "\uFEFF",
    );
  }
});

test("decodes UTF-8 ranges including empty, astral, malformed and embedded NUL data", () => {
  for (const text of ["", "hello", "héllo🌍", "\uFEFF", "a\0b", "\uFEFF\uFEFF"]) {
    const bytes = Buffer.from("prefix" + text + "suffix");
    expect(decodeAstString(bytes, 6, Buffer.byteLength(text))).toBe(text);
  }
  for (const bytes of [
    [0xed],
    [0xed, 0xa0],
    [0xed, 0x80, 0x80],
    [0xff, 0x80, 0xc0],
    [0xe0, 0x80, 0x80],
  ]) {
    expect(decodeAstString(Uint8Array.from(bytes), 0, bytes.length)).toBe(
      Buffer.from(bytes).toString("utf8"),
    );
  }
});

test("structured arrays, uints, booleans and strings decode every supported marker", () => {
  for (const header of [[0x91], [0xdc, 0, 1], [0xdd, 0, 0, 0, 1]]) {
    const bytes = Uint8Array.from([...header, 0x7f]);
    const reader = new AstMsgpackReader(bytes, 0, bytes.length);
    expect(reader.arrayLength()).toBe(1);
    expect(reader.uint()).toBe(127);
  }
  for (const [encoded, value] of [
    [[0], 0],
    [[0xcc, 255], 255],
    [[0xcd, 128, 0], 32768],
    [[0xce, 255, 255, 255, 255], 0xffffffff],
  ] as const) {
    expect(new AstMsgpackReader(Uint8Array.from(encoded), 0, encoded.length).uint()).toBe(value);
  }
  for (const header of [[0xa3], [0xd9, 3], [0xda, 0, 3], [0xdb, 0, 0, 0, 3]]) {
    const bytes = Uint8Array.from([...header, 0xed, 0xa0, 0x80]);
    expect(new AstMsgpackReader(bytes, 0, bytes.length).string()).toBe("\uD800");
  }
  const reader = new AstMsgpackReader(Uint8Array.from([0xc2, 0xc3]), 0, 2);
  expect(reader.bool()).toBe(false);
  expect(reader.bool()).toBe(true);
});

test("structured lengths cannot allocate or read outside their own section", () => {
  const hugeArray = Uint8Array.from([0xdd, 255, 255, 255, 255]);
  expect(() => new AstMsgpackReader(hugeArray, 0, hugeArray.length).arrayLength()).toThrow(
    "array exceeds",
  );
  const hugeString = Uint8Array.from([0xdb, 255, 255, 255, 255]);
  expect(() => new AstMsgpackReader(hugeString, 0, hugeString.length).string()).toThrow(
    "string exceeds",
  );
  const crossing = Uint8Array.from([0xa3, 65, 66, 67]);
  expect(() => new AstMsgpackReader(crossing, 0, 3).string()).toThrow("string exceeds");
  expect(() => new AstMsgpackReader(new Uint8Array(), 0, 0).uint()).toThrow("truncated");
  expect(() => new AstMsgpackReader(crossing, 1, 0)).toThrow("byte range");
});

test("structured data rejects unsupported marker types", () => {
  for (const marker of [0xc0, 0xc1, 0xcb, 0xcf, 0xff]) {
    const bytes = Uint8Array.from([marker]);
    expect(() => new AstMsgpackReader(bytes, 0, 1).arrayLength()).toThrow();
    expect(() => new AstMsgpackReader(bytes, 0, 1).uint()).toThrow();
    expect(() => new AstMsgpackReader(bytes, 0, 1).bool()).toThrow();
    expect(() => new AstMsgpackReader(bytes, 0, 1).string()).toThrow();
  }
});

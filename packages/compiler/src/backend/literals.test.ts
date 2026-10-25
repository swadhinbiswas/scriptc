import { expect, test } from "vitest";
import {
  commentText,
  hasLoneSurrogate,
  llvmBytes,
  llvmQuoted,
  octalByte,
  unsignedHex,
  wtf8Bytes,
} from "./literals.js";
import { f64Lit, llvmCommentText } from "./llvm/common.js";
import { mangleFunction, mangleLocal } from "./mangle.js";

test("integer escaping agrees with JavaScript across all UTF-16 code units", () => {
  for (let value = 0; value <= 0xffff; value++) expect(unsignedHex(value)).toBe(value.toString(16));
  for (const value of [0x10000, 0x10ffff, 2 ** 32, 2 ** 48 - 1, Number.MAX_SAFE_INTEGER]) {
    expect(unsignedHex(value)).toBe(value.toString(16));
  }
  for (const value of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    expect(() => unsignedHex(value)).toThrow(RangeError);
  }
});

test("octal and LLVM escapes cover every byte without ambiguous suffixes", () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
  for (const byte of bytes) expect(octalByte(byte)).toBe(byte.toString(8).padStart(3, "0"));
  const expected = [...bytes]
    .map((b) =>
      b >= 32 && b < 127 && b !== 34 && b !== 92
        ? String.fromCharCode(b)
        : "\\" + b.toString(16).padStart(2, "0").toUpperCase(),
    )
    .join("");
  expect(llvmBytes(bytes)).toBe(expected + "\\00");
  expect(llvmBytes(bytes, false)).toBe(expected);
  expect(llvmBytes(new Uint8Array())).toBe("\\00");
});

test("metadata strings preserve UTF-8 replacement, embedded NUL and quotes", () => {
  for (const text of [
    "",
    "alpha.ts",
    "é/日本/😀.ts",
    'quote"slash\\\0',
    "\ud800",
    "\udfff",
    "\ud83d\ude00",
  ]) {
    const bytes = Buffer.from(text, "utf8");
    expect(llvmQuoted(text)).toBe('"' + llvmBytes(bytes, false) + '"');
  }
  expect(llvmQuoted("é")).toBe('"\\C3\\A9"');
  expect(llvmQuoted("\ud800")).toBe('"\\EF\\BF\\BD"');
});

test("comments preserve ordinary text and encode all source-control units", () => {
  const text =
    Array.from({ length: 0x100 }, (_, i) => String.fromCharCode(i)).join("") +
    "\u2028\u2029é😀\ud800/*end*/";
  /* oxlint-disable no-control-regex -- Exercise escaping of every source-control unit. */
  const expected = text.replace(
    /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g,
    (ch) => "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"),
  );
  /* oxlint-enable no-control-regex */
  expect(commentText(text)).toBe(expected);
  expect(llvmCommentText(text)).toBe(expected);
});

test("name spelling remains stable, including surrogate units", () => {
  for (const name of ["abc_X9", "x.12", "$x%y", "é日本", "😀", "\ud800\0", "dash-here"]) {
    const expected = name.replace(/[^A-Za-z0-9_]/g, (ch) =>
      ch === "." ? "_" : `_x${ch.codePointAt(0)!.toString(16)}_`,
    );
    expect(mangleFunction(name)).toBe("sc_f_" + expected);
    expect(mangleLocal(name)).toBe("sc_l_" + expected);
  }
});

test("double spelling preserves every bit, including signed zero and subnormals", () => {
  for (const number of [
    0,
    -0,
    1,
    -1,
    0.1,
    Number.MIN_VALUE,
    Number.MAX_VALUE,
    Infinity,
    -Infinity,
    NaN,
  ]) {
    const bytes = Buffer.alloc(8);
    bytes.writeDoubleBE(number);
    expect(f64Lit(number)).toBe("0x" + bytes.toString("hex").toUpperCase());
  }
});

test("string storage bytes keep lone surrogates as WTF-8 and pairs as UTF-8", () => {
  const hex = (text: string): string => Buffer.from(wtf8Bytes(text)).toString("hex");
  expect(hex("")).toBe("");
  expect(hex("é日😀")).toBe(Buffer.from("é日😀").toString("hex"));
  expect(hex("\ud800")).toBe("eda080");
  expect(hex("\udfff")).toBe("edbfbf");
  expect(hex("a\ud83d\ude00b")).toBe("61f09f988062");
  expect(hex("\ude00\ud83d")).toBe("edb880eda0bd");
  expect(hex("\ud83d😀\ud7ff")).toBe("eda0bdf09f9880ed9fbf");
  for (const text of ["\ud800", "x\udc00y", "\ud83d\ud83d", "😀\ude00"]) {
    expect(hasLoneSurrogate(text)).toBe(true);
    expect(wtf8Bytes(text).length).toBe(Buffer.byteLength(text, "utf8"));
  }
  for (const text of ["", "plain", "😀", "\ud7ff\ue000"])
    expect(hasLoneSurrogate(text)).toBe(false);
});

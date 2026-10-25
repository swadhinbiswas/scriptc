import { expect, test } from "vitest";
import { staticTextDecoderEncoding } from "./text-decoder-encoding.js";

const encodings = [
  "ibm866",
  "iso-8859-2",
  "iso-8859-3",
  "iso-8859-4",
  "iso-8859-5",
  "iso-8859-6",
  "iso-8859-7",
  "iso-8859-8",
  "iso-8859-10",
  "iso-8859-13",
  "iso-8859-14",
  "iso-8859-15",
  "iso-8859-16",
  "koi8-r",
  "koi8-u",
  "macintosh",
  "windows-874",
  "windows-1250",
  "windows-1251",
  "windows-1252",
  "windows-1253",
  "windows-1254",
  "windows-1255",
  "windows-1256",
  "windows-1257",
  "windows-1258",
  "x-mac-cyrillic",
  "x-user-defined",
  "utf-16le",
  "utf-16be",
  "gb18030",
  "big5",
  "euc-jp",
  "iso-2022-jp",
  "shift_jis",
  "euc-kr",
  "iso-8859-8-i",
  "gbk",
];

test("static encoding IDs retain the native decoder table order", () => {
  for (const [id, name] of encodings.entries()) {
    expect(staticTextDecoderEncoding(name), name).toEqual({ kind: "legacy", id });
    expect(staticTextDecoderEncoding(` \t${name.toUpperCase()}\r\n\f`), name).toEqual({
      kind: "legacy",
      id,
    });
  }
  for (const label of [
    "utf-8",
    "unicode-1-1-utf-8",
    "unicode11utf8",
    "unicode20utf8",
    "utf8",
    "x-unicode20utf8",
  ]) {
    expect(staticTextDecoderEncoding(`\t${label.toUpperCase()} `), label).toEqual({ kind: "utf8" });
  }
});

test("Node aliases select the same encoding families", () => {
  for (const label of [
    "latin1",
    "ascii",
    "cp1252",
    "csisolatin2",
    "ISO_8859-6:1987",
    "koi8",
    "cp866",
    "windows-31j",
    "ms932",
    "ks_c_5601-1987",
    "utf-16",
    "unicodefffe",
    "big5-hkscs",
    "cseucpkdfmtjapanese",
    "logical",
    "visual",
    "chinese",
    "gb2312",
  ]) {
    const parsed = staticTextDecoderEncoding(label);
    expect(parsed?.kind, label).toBe("legacy");
    if (parsed?.kind === "legacy")
      expect(encodings[parsed.id], label).toBe(new TextDecoder(label).encoding);
  }
});

test("label normalization does not admit Unicode whitespace or prototype keys", () => {
  for (const label of [
    "constructor",
    "toString",
    "__proto__",
    "hasOwnProperty",
    "",
    "utf-32",
    "utf-7",
    "replacement",
    "\u00a0utf-8",
    "utf-8\u00a0",
    "\vutf-8",
    "utf-8\0",
  ]) {
    expect(staticTextDecoderEncoding(label), JSON.stringify(label)).toBeNull();
    expect(() => new TextDecoder(label), JSON.stringify(label)).toThrow();
  }
  // This compiler slice deliberately recognizes ASCII aliases only.
  for (const label of ["Koi8-r", "ſhift_jis"]) expect(staticTextDecoderEncoding(label)).toBeNull();
});

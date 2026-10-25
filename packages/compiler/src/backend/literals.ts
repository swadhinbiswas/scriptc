import { unsignedHex } from "../format-integer.js";
export { unsignedHex } from "../format-integer.js";

/** Three octal digits prevent a following source digit extending an escape. */
export function octalByte(value: number): string {
  const digits = "01234567";
  return (
    digits.charAt((value >>> 6) & 3) + digits.charAt((value >>> 3) & 7) + digits.charAt(value & 7)
  );
}

/** LLVM byte-string contents, without quotes or the c prefix. */
export function llvmBytes(bytes: Uint8Array, nulTerminated = true): string {
  let out = "";
  for (const byte of bytes) {
    out +=
      byte >= 0x20 && byte < 0x7f && byte !== 0x22 && byte !== 0x5c
        ? String.fromCharCode(byte)
        : "\\" + unsignedHex(byte).padStart(2, "0").toUpperCase();
  }
  return nulTerminated ? out + "\\00" : out;
}

const LONE_SURROGATE = /\p{Cs}/u;

/** Whether a JS string holds a lone UTF-16 surrogate. */
export function hasLoneSurrogate(text: string): boolean {
  return LONE_SURROGATE.test(text);
}

/** A JS string's bytes in the runtime's string storage: UTF-8, with each
 * lone surrogate as its generalized 3-byte encoding (WTF-8). A lone
 * surrogate takes as many bytes as the U+FFFD that Buffer's UTF-8 encoder
 * substitutes, so `Buffer.byteLength(text, "utf8")` is also this length. */
export function wtf8Bytes(text: string): Uint8Array {
  const bytes = Buffer.from(text, "utf8");
  if (!hasLoneSurrogate(text)) return bytes;
  let at = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.codePointAt(i)!;
    if (code >= 0x10000) {
      i++;
      at += 4;
    } else if (code >= 0xd800 && code <= 0xdfff) {
      bytes[at] = 0xed;
      bytes[at + 1] = 0x80 | ((code >> 6) & 0x3f);
      bytes[at + 2] = 0x80 | (code & 0x3f);
      at += 3;
    } else {
      at += code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
    }
  }
  return bytes;
}

/** Metadata operands use the same UTF-8 escapes, without a trailing NUL. */
export function llvmQuoted(text: string): string {
  return '"' + llvmBytes(Buffer.from(text, "utf8"), false) + '"';
}

/** Escape UTF-16 source-control units without combining surrogate pairs. */
export function commentText(text: string): string {
  let out = "";
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x20 || (code >= 0x7f && code <= 0x9f) || code === 0x2028 || code === 0x2029) {
      out += text.slice(start, i) + "\\u" + unsignedHex(code).padStart(4, "0");
      start = i + 1;
    }
  }
  return out + text.slice(start);
}

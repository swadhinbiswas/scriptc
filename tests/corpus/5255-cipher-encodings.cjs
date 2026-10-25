// Cipheriv and Decipheriv encodings: string inputs in utf8, hex, base64,
// base64url, latin1, ascii and utf16le; keys, IVs and data as Buffers,
// typed arrays, DataViews, ArrayBuffers and strings; and string outputs
// through the StringDecoder Node keeps between update() and final(), so a
// UTF-8 character or a base64 group split across calls comes out whole.
"use strict";
const crypto = require("crypto");

const key = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex");
const iv = Buffer.from("f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff", "hex");
const ctr = () => crypto.createCipheriv("aes-128-ctr", key, iv);

for (const encoding of ["utf8", "hex", "base64", "base64url", "latin1", "binary", "ascii", "utf16le", "ucs2", "UTF-8"]) {
  const input = encoding === "hex" ? "48656c6c6f" : encoding.startsWith("base64") ? "SGVsbG8_" : "Héllo";
  console.log("input", encoding, ctr().update(input, encoding).toString("hex"));
}

const text = "naïve café — ½ € 😀 done";
const encrypted = ctr().update(text);
for (const encoding of ["utf8", "utf16le", "latin1", "hex", "base64", "base64url", "ascii"]) {
  const decipher = crypto.createDecipheriv("aes-128-ctr", key, iv);
  const source = encoding === "utf8" ? encrypted : ctr().update(Buffer.from(text, encoding === "utf16le" ? "utf16le" : "utf8"));
  const pieces = [];
  for (let i = 0; i < source.length; i += 3) pieces.push(decipher.update(source.subarray(i, i + 3), undefined, encoding));
  pieces.push(decipher.final(encoding));
  console.log("output", encoding, JSON.stringify(pieces.slice(0, 6)), JSON.stringify(pieces.join("")));
}

const gcmKey = new Uint8Array(32).fill(7);
const gcmIv = new DataView(new ArrayBuffer(12));
const gcm = crypto.createCipheriv("aes-256-gcm", gcmKey, gcmIv);
gcm.setAAD(new Uint16Array([1, 2, 3]));
const gcmOut = gcm.update(new Float64Array([1.5, -2]), undefined, "base64") + gcm.final("base64");
console.log("views", gcmOut, gcm.getAuthTag().toString("hex"));
const fromArrayBuffer = crypto.createCipheriv("aes-128-cbc", new Uint8Array(key).buffer, iv.buffer.slice(iv.byteOffset, iv.byteOffset + 16));
console.log("array buffers", fromArrayBuffer.update("abc", "utf8", "hex") + fromArrayBuffer.final("hex"));
const stringKey = crypto.createCipheriv("aes-128-cbc", "sixteen byte key", "sixteen byte iv!");
console.log("string key", stringKey.update("abc", "utf8", "hex") + stringKey.final("hex"));
const aadEncoding = crypto.createCipheriv("aes-128-gcm", key, iv.subarray(0, 12));
aadEncoding.setAAD("616164", { encoding: "hex" });
aadEncoding.final();
console.log("aad encoding", aadEncoding.getAuthTag().toString("hex"));
const tagEncoding = crypto.createDecipheriv("aes-128-gcm", key, iv.subarray(0, 12));
tagEncoding.setAAD(Buffer.from("aad"));
tagEncoding.setAuthTag(aadEncoding.getAuthTag().toString("base64"), "base64");
console.log("tag encoding", tagEncoding.final().length);
const base64Split = crypto.createCipheriv("aes-128-ctr", key, iv);
console.log("base64 carry", [1, 2, 3, 4, 5].map((n) => base64Split.update(Buffer.alloc(n), undefined, "base64")).join("|"), base64Split.final("base64"));

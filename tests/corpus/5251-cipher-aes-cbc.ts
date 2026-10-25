// AES-CBC for 128, 192 and 256-bit keys and OpenSSL's aes128/aes192/aes256
// aliases: PKCS#7 padding, the number of bytes each update() returns
// (decryption holds the last full block back for padding), setAutoPadding,
// and the OpenSSL errors Node reports for bad padding and a partial final
// block, including their code, library, reason and opensslErrorStack.
import { createCipheriv, createDecipheriv } from "node:crypto";

function pattern(length: number, seed: number): Buffer {
  const out = Buffer.alloc(length);
  for (let i = 0; i < length; i++) out[i] = (i * 29 + seed) & 0xff;
  return out;
}

function describe(error: unknown): string {
  const e = error as Error & { code?: string };
  const fields = error as { library?: unknown; reason?: unknown; opensslErrorStack?: unknown };
  return [e.name, e.code, e.message, fields.library ?? "-", fields.reason ?? "-", fields.opensslErrorStack === undefined ? "-" : JSON.stringify(fields.opensslErrorStack)].join(" | ");
}

for (const [name, keyLength] of [
  ["aes-128-cbc", 16],
  ["aes-192-cbc", 24],
  ["aes-256-cbc", 32],
  ["AES128", 16],
  ["aes192", 24],
  ["Aes256", 32],
] as const) {
  const key = pattern(keyLength, keyLength);
  const iv = pattern(16, 3);
  for (const length of [0, 1, 15, 16, 17, 32, 45]) {
    const cipher = createCipheriv(name, key, iv);
    const ciphertext = Buffer.concat([cipher.update(pattern(length, 7)), cipher.final()]);
    const decipher = createDecipheriv(name, key, iv);
    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    console.log(name, length, ciphertext.length, ciphertext.subarray(-16).toString("hex"), plain.equals(pattern(length, 7)));
  }
}

const key = pattern(16, 1);
const iv = pattern(16, 2);
const chunked = createCipheriv("aes-128-cbc", key, iv);
const sizes = [5, 11, 1, 20, 16, 0, 31].map((n, i) => chunked.update(pattern(n, i)).length);
console.log("encrypt chunks", sizes.join(","), chunked.final().length);
const ciphertext = Buffer.concat([createCipheriv("aes-128-cbc", key, iv).update(pattern(48, 4)), Buffer.alloc(0)]);
const holding = createDecipheriv("aes-128-cbc", key, iv).setAutoPadding(false);
const unpadded = createDecipheriv("aes-128-cbc", key, iv);
console.log(
  "decrypt chunks",
  [16, 16, 16].map((n, i) => unpadded.update(ciphertext.subarray(i * 16, i * 16 + n)).length).join(","),
  [7, 25, 16].map((n, i) => holding.update(ciphertext.subarray([0, 7, 32][i], [0, 7, 32][i]! + n)).length).join(","),
);
console.log("holding final", holding.final().length);
try {
  unpadded.final();
} catch (error) {
  console.log("bad decrypt", describe(error));
}

const noPad = createCipheriv("aes-256-cbc", pattern(32, 5), iv).setAutoPadding(false);
console.log("no padding", noPad.update(pattern(32, 1)).toString("hex"), noPad.final().length);
const partial = createCipheriv("aes-256-cbc", pattern(32, 5), iv).setAutoPadding(false);
partial.update("seventeen bytes!!");
try {
  partial.final();
} catch (error) {
  console.log("partial block", describe(error));
}
const defaultArgument = createCipheriv("aes-128-cbc", key, iv);
defaultArgument.setAutoPadding();
defaultArgument.update("abc");
try {
  defaultArgument.final();
} catch (error) {
  console.log("setAutoPadding()", describe(error));
}
const padded = createCipheriv("aes-128-cbc", key, iv);
padded.setAutoPadding(false);
padded.setAutoPadding(true);
console.log("re-enabled", padded.update("abc", "utf8", "hex") + padded.final("hex"));
const decryptPartial = createDecipheriv("aes-128-cbc", key, iv);
decryptPartial.update(Buffer.alloc(20));
try {
  decryptPartial.final();
} catch (error) {
  console.log("decrypt partial", describe(error));
}
try {
  padded.setAutoPadding(true);
} catch (error) {
  console.log("after final", describe(error));
}

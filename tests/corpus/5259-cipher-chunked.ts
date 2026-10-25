// Chunked encryption with every implemented cipher: 4 KiB of data
// encrypted in deterministic pseudo-random chunk sizes produces the same
// ciphertext and tag as one update(), the sum of the update() lengths and
// the final() length matches the ciphertext, and decryption in a different
// chunking restores the data. Digests summarize the outputs.
import { createCipheriv, createDecipheriv, createHash, type CipherGCM, type DecipherGCM } from "node:crypto";

let seed = 12345;
function next(limit: number): number {
  seed = (seed * 1103515245 + 12345) % 2147483648;
  return seed % limit;
}

const data = Buffer.alloc(4096);
for (let i = 0; i < data.length; i++) data[i] = next(256);

const names = [
  "aes-128-cbc",
  "aes-192-cbc",
  "aes-256-cbc",
  "aes-128-ctr",
  "aes-192-ctr",
  "aes-256-ctr",
  "aes-128-gcm",
  "aes-192-gcm",
  "aes-256-gcm",
  "chacha20-poly1305",
];
for (const name of names) {
  const keyLength = name.includes("128") ? 16 : name.includes("192") ? 24 : 32;
  const key = Buffer.alloc(keyLength, keyLength);
  const iv = Buffer.alloc(name.includes("cbc") || name.includes("ctr") ? 16 : 12, 3);
  const aead = name.includes("gcm") || name.includes("chacha");
  const once = createCipheriv(name, key, iv);
  const expected = Buffer.concat([once.update(data), once.final()]);
  const expectedTag = aead ? (once as CipherGCM).getAuthTag().toString("hex") : "";
  const chunked = createCipheriv(name, key, iv);
  const parts: Buffer[] = [];
  let lengths = 0;
  for (let offset = 0; offset < data.length; ) {
    const size = Math.min(1 + next(300), data.length - offset);
    const part = chunked.update(data.subarray(offset, offset + size));
    lengths += part.length;
    parts.push(part);
    offset += size;
  }
  const last = chunked.final();
  parts.push(last);
  const ciphertext = Buffer.concat(parts);
  const tag = aead ? (chunked as CipherGCM).getAuthTag().toString("hex") : "";
  const decipher = createDecipheriv(name, key, iv);
  if (aead) (decipher as DecipherGCM).setAuthTag(Buffer.from(tag, "hex"));
  const plain: Buffer[] = [];
  for (let offset = 0; offset < ciphertext.length; offset += 1000) plain.push(decipher.update(ciphertext.subarray(offset, offset + 1000)));
  plain.push(decipher.final());
  console.log(
    name,
    ciphertext.equals(expected),
    tag === expectedTag,
    lengths + last.length === ciphertext.length,
    Buffer.concat(plain).equals(data),
    createHash("sha256").update(ciphertext).digest("hex").slice(0, 16),
    tag.slice(0, 8),
  );
}

// AES-CTR for 128, 192 and 256-bit keys: output length equals input length
// for every update(), chunked encryption matches one-shot encryption across
// keystream block boundaries, the 128-bit counter carries into the upper
// bytes and wraps after all ones, decryption is the same transform, and
// setAAD/getAuthTag report Node's invalid-state errors for a mode without
// authentication.
import { createCipheriv, createDecipheriv, type CipherGCM } from "node:crypto";

function pattern(length: number, seed: number): Buffer {
  const out = Buffer.alloc(length);
  for (let i = 0; i < length; i++) out[i] = (i * 17 + seed) & 0xff;
  return out;
}

const data = pattern(200, 1);
for (const bits of [128, 192, 256]) {
  const key = pattern(bits / 8, bits);
  const iv = pattern(16, 2);
  const whole = createCipheriv(`aes-${bits}-ctr`, key, iv).update(data);
  const chunked = createCipheriv(`aes-${bits}-ctr`, key, iv);
  const lengths: number[] = [];
  const parts: Buffer[] = [];
  for (const size of [1, 15, 16, 17, 3, 48, 100]) {
    const part = chunked.update(data.subarray(lengths.reduce((a, b) => a + b, 0), lengths.reduce((a, b) => a + b, 0) + size));
    lengths.push(size);
    parts.push(part);
  }
  parts.push(chunked.final());
  const joined = Buffer.concat(parts);
  const back = createDecipheriv(`aes-${bits}-ctr`, key, iv).update(joined);
  console.log(`aes-${bits}-ctr`, parts.map((p) => p.length).join(","), joined.equals(whole), back.equals(data));
  console.log(whole.subarray(0, 24).toString("hex"), whole.subarray(-8).toString("hex"));
}

for (const ivHex of ["ffffffffffffffffffffffffffffffff", "0000000000000000ffffffffffffffff", "000000000000000000000000fffffffe"]) {
  const cipher = createCipheriv("aes-128-ctr", pattern(16, 5), Buffer.from(ivHex, "hex"));
  console.log("counter", ivHex, cipher.update(Buffer.alloc(48)).toString("hex"));
}

const ctr = createCipheriv("aes-128-ctr", pattern(16, 5), pattern(16, 6)) as unknown as CipherGCM;
try {
  ctr.setAAD(Buffer.from("aad"));
} catch (error) {
  console.log("setAAD", (error as Error).message);
}
ctr.final();
try {
  ctr.getAuthTag();
} catch (error) {
  console.log("getAuthTag", (error as Error).message);
}
console.log("hex", createCipheriv("aes-256-ctr", pattern(32, 1), pattern(16, 1)).update("6162636465", "hex", "hex"));

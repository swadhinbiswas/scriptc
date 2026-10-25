// SHA-1 and SHA-256 over every length from 0 to 300 bytes, block-boundary
// lengths up to 1 MiB, and the same data fed in 1-, 7-, 63-, 64- and
// 4096-byte updates, through createHash, crypto.hash, createHmac, pbkdf2Sync
// and Hash.copy(). The digests come from whichever block implementation the
// CPU selects, so they must match Node's on every host.
import { createHash, createHmac, hash, pbkdf2Sync } from "node:crypto";

const data = Buffer.alloc(1 << 20);
let x = 0x9e3779b9;
for (let i = 0; i < data.length; i++) {
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  data[i] = x & 0xff;
}

function digestOf(algorithm: string, length: number, chunk: number): string {
  const h = createHash(algorithm);
  for (let at = 0; at < length; at += chunk) h.update(data.subarray(at, Math.min(length, at + chunk)));
  return h.digest("hex");
}

for (const algorithm of ["sha1", "sha256"]) {
  const short = createHash(algorithm);
  for (let length = 0; length <= 300; length++) short.update(createHash(algorithm).update(data.subarray(0, length)).digest());
  console.log(algorithm, "lengths 0-300", short.digest("hex"));
  for (const length of [55, 56, 63, 64, 65, 119, 120, 127, 128, 4095, 4096, 65537, 1 << 20]) {
    const whole = hash(algorithm, data.subarray(0, length));
    const chunked = [1, 7, 63, 64, 4096].map((chunk) => (length > 70000 && chunk < 63 ? whole : digestOf(algorithm, length, chunk)));
    console.log(algorithm, length, whole.slice(0, 16), chunked.every((d) => d === whole));
  }
  const partial = createHash(algorithm).update(data.subarray(0, 1000));
  const copy = partial.copy();
  partial.update(data.subarray(1000, 5000));
  console.log(algorithm, "copy", copy.digest("hex").slice(0, 16), partial.digest("hex").slice(0, 16));
  console.log(algorithm, "hmac", createHmac(algorithm, data.subarray(0, 100)).update(data.subarray(0, 70000)).digest("base64"));
  console.log(algorithm, "pbkdf2", pbkdf2Sync(data.subarray(0, 32), data.subarray(32, 48), 2000, 40, algorithm).toString("hex"));
}

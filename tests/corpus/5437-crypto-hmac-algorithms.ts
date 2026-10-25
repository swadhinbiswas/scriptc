// HMAC over every non-XOF digest, with keys shorter than, equal to and
// longer than each digest's block (144 bytes for SHA3-224). XOF digests
// are refused when the Hmac is created.
import { createHmac, getHashes } from "node:crypto";

const xofs = new Set(["shake128", "shake256", "shake-128", "shake-256", "keccak-kmac-128", "keccak-kmac-256", "keccak-kmac128", "keccak-kmac256"]);
const keyLengths = [0, 20, 64, 72, 104, 128, 136, 144, 145, 200];

for (const name of getHashes()) {
  if (xofs.has(name)) continue;
  const parts: string[] = [];
  for (const length of keyLengths) {
    const key = "k".repeat(length);
    const one = createHmac(name, key).update("message").digest("hex");
    const two = createHmac(name, Buffer.from(key)).update("mess").update("age").digest("hex");
    if (one !== two) console.log("mismatch", name, length);
    parts.push(one.slice(0, 8));
  }
  console.log(name, parts.join(" "));
}

for (const name of ["shake128", "SHAKE256", "keccak-kmac-128", "keccak-kmac256"]) {
  try {
    createHmac(name, "key");
    console.log(name, "created");
  } catch (e) {
    const error = e as Error & { code?: string };
    console.log(name, error.name, error.code, error.message);
  }
}
console.log(createHmac("blake2b512", "key").update("data").digest("hex"));
console.log(createHmac("md5-sha1", "key").update("data").digest("base64"));
console.log(createHmac("sha3-224", "k".repeat(200)).update("x").digest("hex"));

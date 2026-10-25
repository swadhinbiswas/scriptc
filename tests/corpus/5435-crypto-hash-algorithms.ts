// Every digest crypto.getHashes() lists, one-shot and in chunks across
// block boundaries, with copy() mid-stream and the XOFs' default lengths.
import { createHash, getHashes, hash } from "node:crypto";

const names = getHashes();
console.log(names.length);

const sizes = [0, 1, 55, 56, 63, 64, 65, 71, 72, 73, 103, 104, 127, 128, 129, 135, 136, 143, 144, 167, 168, 169, 300];
let text = "";
for (let i = 0; i < 300; i++) text += String.fromCharCode(97 + ((i * 7) % 26));

for (const name of names) {
  const lengths: number[] = [];
  let combined = createHash("sha256");
  for (const size of sizes) {
    const input = text.slice(0, size);
    const whole = createHash(name).update(input).digest("hex");
    const pieces = createHash(name);
    for (let at = 0; at < size; at += 13) pieces.update(input.slice(at, at + 13));
    const copy = pieces.copy();
    const chunked = pieces.digest("hex");
    if (chunked !== whole || copy.digest("hex") !== whole) console.log("mismatch", name, size);
    combined = combined.update(whole);
    lengths.push(whole.length / 2);
  }
  const abc = hash(name, "abc");
  console.log(name, lengths[0], abc.slice(0, 24), combined.digest("base64").slice(0, 16));
}

const upper = createHash("SHA3-256").update("abc").digest("hex");
console.log(upper === createHash("sha3-256").update("abc").digest("hex"), upper);
console.log(createHash("shake128").update("").digest("hex"));
console.log(createHash("shake256").update("").digest("hex"));
console.log(createHash("keccak-kmac-128").update("abc").digest("base64"));
console.log(createHash("keccak-kmac-256").update("abc").digest().length);
console.log(createHash("md5-sha1").update("abc").digest("hex"));
console.log(hash("sha512-224", "abc"), hash("sha512-256", "abc", "base64"));
console.log(hash("ripemd160", Buffer.from("abc")), hash("sm3", "abc"));

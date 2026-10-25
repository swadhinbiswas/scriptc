// XOF output lengths through createHash, copy and crypto.hash, Node's
// errors for the outputLength option, and typed encodings and views in
// TypeScript.
import { type BinaryToTextEncoding, createHash, createHmac, hash } from "node:crypto";

interface CryptoError extends Error {
  code?: string;
  library?: string;
  reason?: string;
}

function show(label: string, fn: () => string): void {
  try {
    console.log(label, fn());
  } catch (e) {
    const error = e as CryptoError;
    console.log(label, "throws", error.name, error.code, error.message, error.library, error.reason);
  }
}

for (const length of [0, 1, 16, 31, 32, 64, 65, 168, 200, 1000]) {
  const shake128 = createHash("shake128", { outputLength: length }).update("abc").digest("hex");
  const shake256 = createHash("SHAKE256", { outputLength: length }).update("abc").digest();
  const kmac = createHash("keccak-kmac-128", { outputLength: length }).digest("base64");
  console.log(length, shake128.length, shake128.slice(-16), shake256.length, kmac.slice(0, 12));
}
show("shake128 1000 tail", () => createHash("shake128", { outputLength: 1000 }).update("a").digest("hex").slice(-32));
show("shake256 empty", () => createHash("shake256", { outputLength: 0 }).digest("base64"));
show("sha256 32", () => createHash("sha256", { outputLength: 32 }).update("a").digest("hex"));
show("sha256 16", () => createHash("sha256", { outputLength: 16 }).digest("hex"));
show("md5 0", () => createHash("md5", { outputLength: 0 }).digest("hex"));
show("unknown algorithm", () => createHash("nope", { outputLength: 4 }).digest("hex"));
show("negative", () => createHash("shake128", { outputLength: -1 }).digest("hex"));
show("fraction", () => createHash("shake128", { outputLength: 1.5 }).digest("hex"));
show("too large", () => createHash("shake128", { outputLength: 2 ** 32 }).digest("hex"));
show("very large", () => createHash("shake128", { outputLength: 2 ** 40 }).digest("hex"));
show("negative zero", () => createHash("shake128", { outputLength: -0 }).digest("hex"));
show("undefined", () => createHash("shake128", { outputLength: undefined }).digest("hex"));
show("checked before algorithm", () => createHash("nope", { outputLength: -1 }).digest("hex"));

const base = createHash("shake256").update("copy");
show("copy 4", () => base.copy({ outputLength: 4 }).digest("hex"));
show("copy 100", () => base.copy({ outputLength: 100 }).digest("hex").slice(-20));
show("copy default", () => createHash("shake128", { outputLength: 4 }).update("x").copy().digest("hex"));
show("copy sha512 64", () => createHash("sha512").copy({ outputLength: 64 }).digest("base64").slice(0, 10));
show("copy sha512 8", () => createHash("sha512").copy({ outputLength: 8 }).digest("hex"));
show("copy negative", () => base.copy({ outputLength: -2 }).digest("hex"));
show("original", () => base.digest("hex"));
show("copy after digest", () => base.copy({ outputLength: 4 }).digest("hex"));

show("hash 8", () => hash("shake256", "abc", { outputLength: 8 }));
show("hash 8 base64", () => hash("shake256", "abc", { outputLength: 8, outputEncoding: "base64" }));
show("hash 70 buffer", () => hash("shake128", "abc", { outputLength: 70, outputEncoding: "buffer" }).toString("hex").slice(-12));
show("hash 0", () => hash("shake128", "abc", { outputLength: 0 }));
show("hash sha256 32", () => hash("sha256", "abc", { outputLength: 32 }));
show("hash SHA256 4", () => hash("SHA256", "abc", { outputLength: 4 }));
show("hash md5-sha1 0", () => hash("md5-sha1", "abc", { outputLength: 0 }));
show("hash negative", () => hash("shake256", "abc", { outputLength: -1 }));
show("hash unknown algorithm", () => hash("nope", "abc", { outputLength: 4 }));


const encodings: BinaryToTextEncoding[] = ["hex", "base64", "base64url", "binary"];
for (const encoding of encodings) {
  console.log(encoding, createHash("sha1").update("typed").digest(encoding), hash("sha1", "typed", encoding));
  console.log(encoding, createHmac("sha1", "key").update("typed").digest(encoding));
}
const views: [string, Uint16Array | Float32Array | DataView][] = [
  ["Uint16Array", new Uint16Array([1, 2, 3])],
  ["Float32Array", new Float32Array([0.5, -1])],
  ["DataView", new DataView(new Uint8Array([9, 8, 7, 6]).buffer, 1, 2)],
];
for (const [name, view] of views) {
  console.log(name, createHash("sha256").update(view).digest("hex").slice(0, 16), hash("sha256", view).slice(0, 16));
  console.log(name, createHmac("sha256", view).update(view).digest("base64url"));
}
console.log(createHmac("sha256", "6b6579", { encoding: "hex" }).update("x").digest("hex"));
console.log(createHmac("sha256", new Uint8Array([1, 2]).buffer).update("x").digest("hex"));
console.log(createHash("sha256").update("6869", "hex").update("aGk=", "base64").update("hi", "latin1").digest("hex"));
const buffer: Buffer = hash("sha256", "abc", "buffer");
console.log(buffer.length, buffer.toString("hex").slice(0, 8));
const words = new Uint16Array([1, 2, 3, 65535]);
const doubles = new Float64Array([0.1, -2]);
const window = new DataView(new Uint8Array([5, 6, 7, 8]).buffer, 1, 2);
console.log(createHash("sha256").update(words).digest("hex"), createHash("sha1").update(doubles).digest("base64"));
console.log(createHash("md5").update(window).digest("hex"), createHash("sha512").update(words).digest("base64url").slice(0, 20));
console.log(hash("sha256", words), hash("md5", doubles, "base64"), hash("sha1", window, "hex"));
console.log(createHmac("sha256", words).update(doubles).digest("hex"), createHmac("md5", window).update("x").digest("hex"));
console.log(hash("sha256", "abc", { outputEncoding: "base64" }), hash("sha256", "abc", { outputEncoding: "hex" }));
console.log(hash("sha256", words, { outputEncoding: "base64url" }), hash("md5", "abc", { outputEncoding: "buffer" }).length);

// AES-GCM through createCipheriv/createDecipheriv for 128, 192 and 256-bit
// keys: several setAAD calls before the data, chunked updates, every
// authTagLength Node accepts, IVs of 1, 12, 16 and 64 bytes, string output
// encodings, and decryption checks that reject a wrong tag, a tampered
// ciphertext or changed AAD with Node's error. Keys, IVs, AAD, tags and
// data also arrive through records, untyped values, nested objects, Maps,
// arrays, generics and secret KeyObjects, and each argument alone through
// `any`, including class instances, records and arrays that Node rejects.
// Keys and IVs are fixed byte patterns, so every output is deterministic.
import { createCipheriv, createDecipheriv, createSecretKey, type CipherGCM, type KeyObject } from "node:crypto";

function pattern(length: number, seed: number): Buffer {
  const out = Buffer.alloc(length);
  for (let i = 0; i < length; i++) out[i] = (i * 13 + seed) & 0xff;
  return out;
}

function describe(error: unknown): string {
  const e = error as Error & { code?: string };
  return `${e.name} ${e.code} ${e.message}`;
}

const plaintext = Buffer.from("The quick brown fox jumps over the lazy dog, twice: once and again.");
for (const bits of [128, 192, 256]) {
  const name = `aes-${bits}-gcm` as "aes-128-gcm";
  const key = pattern(bits / 8, bits);
  const iv = pattern(12, 1);
  const cipher = createCipheriv(name, key, iv);
  cipher.setAAD(Buffer.from("header-"));
  cipher.setAAD(Buffer.from("part-two"));
  const parts = [cipher.update(plaintext.subarray(0, 5)), cipher.update(plaintext.subarray(5, 40))];
  parts.push(cipher.update(plaintext.subarray(40)), cipher.final());
  const ciphertext = Buffer.concat(parts);
  const tag = cipher.getAuthTag();
  console.log(name, parts.map((p) => p.length).join(","), ciphertext.toString("hex"), tag.toString("hex"));

  const decipher = createDecipheriv(name, key, iv);
  decipher.setAAD(Buffer.from("header-part-two"));
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  console.log("round trip", decrypted.equals(plaintext));

  for (const [label, change] of [
    ["wrong tag", "tag"],
    ["tampered ciphertext", "data"],
    ["changed aad", "aad"],
  ] as const) {
    const check = createDecipheriv(name, key, iv);
    check.setAAD(Buffer.from(change === "aad" ? "header-part-2" : "header-part-two"));
    const badTag = Buffer.from(tag);
    if (change === "tag") badTag[0] ^= 1;
    check.setAuthTag(badTag);
    const data = Buffer.from(ciphertext);
    if (change === "data") data[3] ^= 0x80;
    const partial = check.update(data);
    try {
      check.final();
      console.log(label, "accepted");
    } catch (error) {
      console.log(label, partial.length, describe(error));
    }
  }
}

const key = pattern(16, 9);
for (const length of [4, 8, 12, 13, 14, 15, 16]) {
  const cipher = createCipheriv("aes-128-gcm", key, pattern(12, 2), { authTagLength: length });
  const out = cipher.update("tag length", "utf8", "hex") + cipher.final("hex");
  const tag = cipher.getAuthTag();
  const decipher = createDecipheriv("aes-128-gcm", key, pattern(12, 2), { authTagLength: length });
  decipher.setAuthTag(tag);
  const back = decipher.update(out, "hex", "utf8") + decipher.final("utf8");
  console.log("authTagLength", length, out, tag.toString("hex"), back);
}

for (const ivLength of [1, 12, 16, 64]) {
  const cipher = createCipheriv("aes-256-gcm", pattern(32, 4), pattern(ivLength, 6));
  const out = cipher.update("iv length", "utf8", "base64") + cipher.final("base64");
  console.log("iv", ivLength, out, cipher.getAuthTag().toString("base64"));
}

const empty = createCipheriv("aes-128-gcm", key, pattern(12, 3));
console.log("empty", empty.final().length, empty.getAuthTag().toString("hex"));
const aadOnly = createCipheriv("aes-128-gcm", key, pattern(12, 3));
aadOnly.setAAD(pattern(40, 8));
console.log("aad only", aadOnly.final().length, aadOnly.getAuthTag().toString("hex"));
const latin = createCipheriv("aes-192-gcm", pattern(24, 5), pattern(12, 5));
const latinOut = latin.update("café", "latin1", "latin1") + latin.final("latin1");
console.log("latin1", Buffer.from(latinOut, "latin1").toString("hex"), latin.getAuthTag().toString("hex"));

for (const length of [0, 3, 17]) {
  try {
    createCipheriv("aes-128-gcm", key, pattern(12, 1), { authTagLength: length });
    console.log("authTagLength", length, "accepted");
  } catch (error) {
    console.log("authTagLength", length, describe(error));
  }
}
const mismatch = createDecipheriv("aes-128-gcm", key, pattern(12, 1), { authTagLength: 12 });
try {
  mismatch.setAuthTag(Buffer.alloc(16));
} catch (error) {
  console.log("setAuthTag", describe(error));
}
const noTag = createDecipheriv("aes-128-gcm", key, pattern(12, 1));
noTag.update(Buffer.alloc(4));
try {
  noTag.final();
} catch (error) {
  console.log("no tag", describe(error));
}

interface Material {
  key: Buffer;
  iv: Uint8Array;
  aad: Buffer;
}
const material: Material = { key: pattern(32, 21), iv: new Uint8Array(pattern(12, 22)), aad: pattern(5, 23) };
const secret: KeyObject = createSecretKey(material.key);
const untyped: any = material;
const nested: any = { inner: material, list: [material.key, material.iv], secret };
const byName = new Map<string, Uint8Array>([
  ["key", material.key],
  ["iv", material.iv],
]);
const listed: Uint8Array[] = [material.key, material.iv, material.aad];
function same<T>(value: T): T {
  return value;
}
function sealWith(label: string, key: any, iv: any, aad: any, data: any): void {
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(aad);
  const sealed = Buffer.concat([c.update(data), c.final()]);
  const tag: any = { value: c.getAuthTag() };
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAAD(aad);
  d.setAuthTag(tag.value);
  const opened = Buffer.concat([d.update(sealed), d.final()]);
  console.log(label, sealed.toString("hex"), opened.equals(Buffer.from(data)));
}
sealWith("record fields", material.key, material.iv, material.aad, material.aad);
sealWith("untyped fields", untyped.key, untyped.iv, untyped.aad, untyped.aad);
sealWith("nested values", nested.inner.key, nested.list[1], nested.inner.aad, nested.inner.aad);
sealWith("map values", byName.get("key"), byName.get("iv"), material.aad, material.aad);
sealWith("array elements", listed[0], listed[1], listed[2], listed[2]);
sealWith("generic values", same(material.key), same(material.iv), same(material.aad), same(material.aad));
sealWith("key object", secret, material.iv, material.aad, material.aad);
sealWith("untyped key object", nested.secret, nested.list[1], material.aad, material.aad);
const typedKey = createCipheriv("aes-256-gcm", secret, material.iv);
console.log("typed key object", Buffer.concat([typedKey.update(material.aad), typedKey.final()]).toString("hex"));

// Each argument on its own through `any`. Buffers, views, secret KeyObjects,
// strings and option records are accepted; class instances, records and
// arrays fail with Node's errors, and an output encoding that is not a
// string is rendered as Node's %s formats it.
class Envelope {
  id: number;
  constructor(id: number) {
    this.id = id;
  }
}
const anyName: any = "aes-256-gcm";
const anyKey: any = material.key;
const anyIv: any = material.iv;
const anyAad: any = material.aad;
const anySecret: any = secret;
const anyTagLength: any = { authTagLength: 16 };
const anyAadOptions: any = { plaintextLength: material.aad.length };
const anyHex: any = "hex";
const anyBuffer: any = "buffer";
const bad: [string, any][] = [
  ["instance", new Envelope(1)],
  ["record", { id: 2 }],
  ["array", [1, 2, 3]],
  ["nested array", [[1, 2], { a: [3] }]],
  ["custom toString", { toString: () => "custom" }],
  ["number", 7],
];
function sealAny(label: string, make: () => CipherGCM, aad: any, data: any): void {
  const c = make();
  c.setAAD(aad);
  const out = c.update(data, undefined, anyHex) + c.final(anyHex);
  const tag: any = c.getAuthTag();
  const d = createDecipheriv("aes-256-gcm", anySecret, anyIv);
  d.setAAD(aad, anyAadOptions);
  d.setAuthTag(tag);
  const opened: any = d.update(out, anyHex);
  console.log(label, out, Buffer.concat([opened, d.final(anyBuffer)]).equals(material.aad));
}
sealAny("any name", () => createCipheriv(anyName, material.key, material.iv), material.aad, material.aad);
sealAny("any key", () => createCipheriv("aes-256-gcm", anyKey, material.iv), material.aad, material.aad);
sealAny("any key object", () => createCipheriv("aes-256-gcm", anySecret, material.iv), material.aad, material.aad);
sealAny("any iv", () => createCipheriv("aes-256-gcm", material.key, anyIv), material.aad, material.aad);
sealAny("any options", () => createCipheriv("aes-256-gcm", material.key, material.iv, anyTagLength), material.aad, material.aad);
sealAny("any aad and data", () => createCipheriv("aes-256-gcm", material.key, material.iv), anyAad, anyAad);
for (const [label, value] of bad) {
  const attempts: [string, () => unknown][] = [
    ["cipher", () => createCipheriv(value, material.key, material.iv)],
    ["key", () => createCipheriv("aes-256-gcm", value, material.iv)],
    ["iv", () => createCipheriv("aes-256-gcm", material.key, value)],
    ["options", () => createCipheriv("aes-256-gcm", material.key, material.iv, value)],
    ["setAAD", () => createCipheriv("aes-256-gcm", material.key, material.iv).setAAD(value)],
    ["setAAD options", () => createCipheriv("aes-256-gcm", material.key, material.iv).setAAD(material.aad, value)],
    ["update", () => createCipheriv("aes-256-gcm", material.key, material.iv).update(value)],
    ["update encoding", () => createCipheriv("aes-256-gcm", material.key, material.iv).update(material.aad, undefined, value)],
    ["final encoding", () => createCipheriv("aes-256-gcm", material.key, material.iv).final(value)],
    ["setAuthTag", () => createDecipheriv("aes-256-gcm", material.key, material.iv).setAuthTag(value)],
  ];
  for (const [site, run] of attempts) {
    try {
      run();
      console.log(label, site, "accepted");
    } catch (error) {
      console.log(label, site, describe(error));
    }
  }
}

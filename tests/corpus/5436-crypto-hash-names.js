// Digest names are case-insensitive and include OpenSSL's provider
// aliases and object identifiers; unknown names throw Node's errors from
// each entry point.
import * as crypto from "node:crypto";

const aliases = [
  ["SHA2-256", "sha256"],
  ["sha-256", "sha256"],
  ["2.16.840.1.101.3.4.2.1", "sha256"],
  ["SHA-512/256", "sha512-256"],
  ["sha2-512/224", "sha512-224"],
  ["SHA-256/192", "sha256-192"],
  ["RIPEMD", "ripemd160"],
  ["RMD160", "ripemd160"],
  ["ripemd-160", "ripemd160"],
  ["BLAKE2B-512", "blake2b512"],
  ["blake2s-256", "blake2s256"],
  ["SHAKE-128", "shake128"],
  ["shake-256", "shake256"],
  ["KECCAK-KMAC128", "keccak-kmac-128"],
  ["RSA-SHA3-384", "sha3-384"],
  ["id-rsassa-pkcs1-v1_5-with-sha3-512", "sha3-512"],
  ["sha1WithRSAEncryption", "sha1"],
  ["ssl3-md5", "md5"],
  ["SM3WithRSAEncryption", "sm3"],
  ["2.16.840.1.101.3.4.2.8", "sha3-256"],
];
for (const [alias, name] of aliases) {
  const a = crypto.createHash(alias).update("names").digest("hex");
  const b = crypto.createHash(name).update("names").digest("hex");
  console.log(alias, a === b, crypto.hash(alias, "names") === b);
}

const show = (label, fn) => {
  try {
    console.log(label, fn());
  } catch (e) {
    console.log(label, e.name, e.code, e.message);
  }
};
for (const name of ["nope", "sha3", "sha-3-256", "shake", "blake2b", "SHA256 ", ""]) {
  show(`createHash ${JSON.stringify(name)}`, () => crypto.createHash(name).digest("hex"));
  show(`createHmac ${JSON.stringify(name)}`, () => crypto.createHmac(name, "k").digest("hex"));
  show(`hash ${JSON.stringify(name)}`, () => crypto.hash(name, "x"));
  show(`pbkdf2Sync ${JSON.stringify(name)}`, () => crypto.pbkdf2Sync("p", "s", 1, 8, name).toString("hex"));
  show(`hkdfSync ${JSON.stringify(name)}`, () => Buffer.from(crypto.hkdfSync(name, "k", "s", "i", 8)).toString("hex"));
}
console.log(crypto.getHashes().includes("sha3-256"), crypto.getHashes().includes("SHA3-256"));

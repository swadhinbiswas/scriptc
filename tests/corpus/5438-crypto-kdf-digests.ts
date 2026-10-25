// PBKDF2 and HKDF over the wider digest set, and Node's failures for XOF
// digests and empty PBKDF2 keys in the synchronous and callback forms.
import { hkdf, hkdfSync, pbkdf2, pbkdf2Sync } from "node:crypto";

for (const name of ["sha3-256", "sha3-512", "blake2b512", "blake2s256", "md5-sha1", "RIPEMD160", "sm3", "sha512-256", "keccak-384"]) {
  const pb = pbkdf2Sync("password", "salt", 3, 70, name).toString("hex");
  const hk = Buffer.from(hkdfSync(name, "key", "salt", "info", 40)).toString("hex");
  console.log(name, pb.slice(0, 32), pb.slice(-16), hk.slice(0, 32));
}

function show(label: string, fn: () => string): void {
  try {
    console.log(label, fn());
  } catch (e) {
    const error = e as Error & { code?: string };
    console.log(label, error.name, error.code, error.message);
  }
}
show("pbkdf2Sync shake256", () => pbkdf2Sync("p", "s", 1, 8, "shake256").toString("hex"));
show("pbkdf2Sync sha256 empty", () => pbkdf2Sync("p", "s", 1, 0, "sha256").toString("hex"));
show("hkdfSync shake128", () => Buffer.from(hkdfSync("shake128", "k", "s", "i", 8)).toString("hex"));
show("hkdfSync shake256 too long", () => Buffer.from(hkdfSync("shake256", "k", "s", "i", 255 * 32 + 1)).toString("hex"));

// Node runs these jobs on its thread pool, so each starts after the
// previous callback to keep the output order fixed.
pbkdf2("p", "s", 1, 8, "shake128", (err) => {
  console.log("pbkdf2 shake128", err?.name, err?.message);
  pbkdf2("p", "s", 1, 0, "sha512", (err) => {
    console.log("pbkdf2 empty", err?.name, err?.message);
    pbkdf2("p", "s", 2, 20, "sha3-224", (err, key) => {
      console.log("pbkdf2 sha3-224", err, key.toString("hex"));
      hkdf("keccak-kmac-256", "k", "s", "i", 8, (err, key) => {
        console.log("hkdf kmac", err?.name, err?.message, key);
        hkdf("blake2s256", "k", "s", "i", 8, (err, key) => {
          console.log("hkdf blake2s", err, Buffer.from(key).toString("hex"));
        });
      });
    });
  });
});
console.log("sync done");

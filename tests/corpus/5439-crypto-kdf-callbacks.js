// The callback forms of pbkdf2 and hkdf pass Node's job failures to the
// callback after the synchronous code finishes.
import { pbkdf2, hkdf } from "node:crypto";

const steps = [
  (next) => pbkdf2("p", "s", 1, 8, "shake256", (err) => { console.log("pbkdf2 shake256", err && err.name, err && err.message, err && err.code); next(); }),
  (next) => pbkdf2("p", "s", 1, 0, "sha256", (err) => { console.log("pbkdf2 0", err && err.message); next(); }),
  (next) => pbkdf2("p", "s", 1, 16, "SHA3-256", (err, key) => { console.log("pbkdf2 SHA3-256", err, key.toString("hex")); next(); }),
  (next) => pbkdf2("p", "s", 1, 16, "dss1", (err, key) => { console.log("pbkdf2 dss1", err, key.toString("hex")); next(); }),
  (next) => hkdf("shake128", "k", "s", "i", 8, (err, key) => { console.log("hkdf shake128", err && err.message, key); next(); }),
  (next) => hkdf("sha512-224", "k", "s", "i", 8, (err, key) => { console.log("hkdf sha512-224", err, Buffer.from(key).toString("hex")); next(); }),
];
const run = (i) => { if (i < steps.length) steps[i](() => run(i + 1)); };
run(0);
try {
  pbkdf2("p", "s", 1, 8, "nope", () => console.log("unreachable"));
} catch (e) {
  console.log("sync", e.name, e.code, e.message);
}
try {
  hkdf("shake256", "k", "s", "i", 255 * 32 + 1, () => console.log("unreachable"));
} catch (e) {
  console.log("sync", e.name, e.code, e.message);
}
console.log("sync done");

// Secret KeyObject argument checks in Node's order: createSecretKey
// inputs and encodings, generateKey(Sync) types and options, export()
// options, equals() arguments and the read-only getters.
import { createHmac, createSecretKey, generateKey, generateKeySync, hkdfSync } from "node:crypto";

const show = (label, fn) => {
  try {
    console.log(label, fn());
  } catch (e) {
    console.log(label, "throws", e.name, e.code, e.message);
  }
};
const key = createSecretKey(Buffer.from("ab"));

show("number", () => createSecretKey(5));
show("null", () => createSecretKey(null));
show("object", () => createSecretKey({}));
show("KeyObject", () => createSecretKey(key));
show("ArrayBuffer", () => createSecretKey(new Uint8Array([1, 2, 3]).buffer).symmetricKeySize);
show("SharedArrayBuffer", () => createSecretKey(new SharedArrayBuffer(4)).symmetricKeySize);
show("encoding unknown", () => createSecretKey("ab", "nope"));
show("encoding number", () => createSecretKey("ab", 5).symmetricKeySize);
show("encoding null", () => createSecretKey("ab", null).symmetricKeySize);
show("encoding base64", () => createSecretKey("YWJj", "base64").export().toString());

show("type number", () => generateKeySync(5, { length: 128 }));
show("type unknown", () => generateKeySync("nope", { length: 128 }));
show("type rsa", () => generateKeySync("rsa", { length: 128 }));
show("type unknown, options number", () => generateKeySync("nope", 5));
show("options missing", () => generateKeySync("aes"));
show("options null", () => generateKeySync("aes", null));
show("options array", () => generateKeySync("aes", []));
show("hmac length missing", () => generateKeySync("hmac", {}));
show("hmac length string", () => generateKeySync("hmac", { length: "64" }));
show("hmac length null", () => generateKeySync("hmac", { length: null }));
show("aes length missing", () => generateKeySync("aes", {}));
show("aes length string", () => generateKeySync("aes", { length: "128" }));
show("callback missing", () => generateKey("hmac", { length: 64 }));
show("callback number", () => generateKey("aes", 5, 7));
show("callback before type", () => generateKey(5, { length: 64 }, 7));

show("export buffer", () => key.export({ format: "buffer" }).length);
show("export format undefined", () => key.export({ format: undefined }).length);
show("export pem", () => key.export({ format: "pem" }));
show("export JWK", () => key.export({ format: "JWK" }));
show("export string", () => key.export("buffer"));
show("export null", () => key.export(null));
show("export array", () => key.export([]));
show("equals Buffer", () => key.equals(/** @type {any} */ (Buffer.from("ab"))));
show("equals missing", () => key.equals());
show("equals null", () => key.equals(null));
show("set type", () => {
  key.type = "public";
  return key.type;
});
show("set symmetricKeySize", () => {
  key.symmetricKeySize = 1;
  return key.symmetricKeySize;
});

show("hmac key", () => createHmac("sha1", key).update("x").digest("hex"));
show("hmac key with encoding", () => createHmac("sha1", key, { encoding: "hex" }).update("x").digest("hex"));
show("hkdf key", () => Buffer.from(hkdfSync("sha1", key, "s", "i", 8)).toString("hex"));
generateKey("hmac", { length: 128 }, (err, generated) => {
  console.log("generated", err, generated.type, generated.symmetricKeySize);
});
console.log("sync done");

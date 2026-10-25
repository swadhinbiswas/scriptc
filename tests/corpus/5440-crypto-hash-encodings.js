// Hash and Hmac data handling: input encodings, views, invalid data,
// output encodings, crypto.hash's string and options forms, createHmac's
// keys and options, and the cSHAKE options, which Node 24.22 validates
// and then refuses.
import { createHash, createHmac, hash } from "node:crypto";

const show = (label, fn) => {
  try {
    const value = fn();
    console.log(label, typeof value === "string" ? JSON.stringify(value) : value);
  } catch (e) {
    console.log(label, "throws", e.name, e.code, e.message);
  }
};

const text = "héllo \u{1F600} \ud800 x";
function checkInput(encoding) {
  show(`update ${String(encoding)}`, () => createHash("sha256").update(text, encoding).digest("hex").slice(0, 16));
  show(`hmac update ${String(encoding)}`, () => createHmac("sha256", "k").update("6869", encoding).digest("hex").slice(0, 16));
}
for (const encoding of ["utf8", "utf-8", "UTF8", "hex", "base64", "base64url", "latin1", "binary", "ascii", "ucs2", "ucs-2", "utf16le", "UTF-16LE", "nope", "", "buffer"]) {
  checkInput(encoding);
}
checkInput(undefined);
checkInput(null);
checkInput(5);
show("hex odd", () => (createHash("sha1").update("abc", "hex"), "updated"));
show("HEX odd", () => (createHmac("sha1", "k").update("abc", "HEX"), "updated"));
show("hex utf16 length", () => createHash("sha1").update("éa", "hex").digest("hex"));
show("hex invalid", () => createHash("sha1").update("zz12", "hex").digest("hex"));
show("base64 junk", () => createHash("sha1").update("@@ab==cd", "base64").digest("hex"));

function checkView(name, view) {
  show(`view ${name}`, () => createHash("md5").update(view).digest("hex"));
  show(`hash view ${name}`, () => hash("md5", view));
  show(`hmac key ${name}`, () => createHmac("md5", view).update("x").digest("hex"));
}
checkView("Uint16Array", new Uint16Array([1, 2, 65535]));
checkView("Int32Array", new Int32Array([-1, 7]));
checkView("Float64Array subarray", new Float64Array([1.5, 2, 3]).subarray(1));
checkView("DataView", new DataView(new ArrayBuffer(8), 2, 3));
checkView("Uint8ClampedArray", new Uint8ClampedArray([300, 4]));
checkView("Buffer", Buffer.from("view"));
show("buffer with encoding", () => createHash("sha1").update(Buffer.from("ab"), "hex").digest("hex"));
/** @param {string} name @param {unknown} bad */
function checkInvalid(name, bad) {
  show(`update ${name}`, () => (createHash("sha1").update(bad), "updated"));
  show(`hash ${name}`, () => hash("sha1", bad));
}
checkInvalid("number", 5);
checkInvalid("null", null);
checkInvalid("undefined", undefined);
checkInvalid("object", {});
checkInvalid("ArrayBuffer", new ArrayBuffer(2));
checkInvalid("array", [1, 2]);
checkInvalid("boolean", true);

// The parameters are unknown: an untyped one is any, and `any` selects the
// string-returning overloads.
/** @param {unknown} encoding */
function checkOutput(encoding) {
  show(`digest ${JSON.stringify(encoding)}`, () => createHash("md5").update("abc").digest(encoding));
  show(`hmac digest ${JSON.stringify(encoding)}`, () => createHmac("md5", "k").update("abc").digest(encoding));
  show(`hash ${JSON.stringify(encoding)}`, () => hash("md5", "abc", encoding));
}
for (const encoding of ["hex", "base64", "base64url", "latin1", "binary", "ascii", "ucs2", "utf16le", "utf8", "HEX", "Base64", "nope", "", "buffer"]) {
  checkOutput(encoding);
}
checkOutput(undefined);
checkOutput(null);
checkOutput(1);
checkOutput(0);
checkOutput(true);
checkOutput({});
checkOutput(["hex"]);

show("digest twice", () => {
  const h = createHash("sha1");
  h.digest();
  return h.digest("hex");
});
show("update after digest", () => {
  const h = createHash("sha1");
  h.digest("base64");
  h.update("x");
  return "updated";
});
for (const encoding of [undefined, "hex", "buffer", "nope", "latin1"]) {
  show(`hmac digest twice ${String(encoding)}`, () => {
    const h = createHmac("sha1", "k");
    h.digest();
    return h.digest(encoding);
  });
}
show("hmac update after digest", () => {
  const h = createHmac("sha1", "k");
  h.digest();
  h.update("x");
  return "updated";
});

show("hash options object", () => hash("sha256", "abc", { outputEncoding: "base64url" }));
show("hash options buffer", () => hash("sha256", "abc", { outputEncoding: "BUFFER" }));
show("hash options empty", () => hash("sha256", "abc", {}));
show("hash outputEncoding null", () => hash("sha256", "abc", { outputEncoding: null }));
show("hash outputEncoding 5", () => hash("sha256", "abc", { outputEncoding: 5 }));
show("hash outputEncoding nope", () => hash("sha256", "abc", { outputEncoding: "nope" }));
show("hash options null", () => hash("sha256", "abc", null));
show("hash options array", () => hash("sha256", "abc", []));
show("hash options number", () => hash("sha256", "abc", 7));
show("hash options function", () => hash("sha256", "abc", () => {}));
show("hash unknown algorithm", () => hash("nope", "abc", "buffer"));
show("hash unknown algorithm and encoding", () => hash("nope", "abc", "nope"));

function checkKey(name, key) {
  for (const options of [undefined, { encoding: "hex" }, { encoding: "base64" }, { encoding: null }, "hex", null]) {
    show(`hmac key ${name} ${JSON.stringify(options)}`, () =>
      createHmac("sha256", key, options).update("x").digest("hex").slice(0, 16));
  }
}
checkKey("string", "6b6579");
checkKey("Buffer", Buffer.from("key"));
checkKey("ArrayBuffer", new ArrayBuffer(3));
checkKey("SharedArrayBuffer", new SharedArrayBuffer(2));
show("hmac key encoding nope", () => (createHmac("sha256", "key", { encoding: "nope" }), "created"));
show("hmac key encoding 5", () => (createHmac("sha256", "key", { encoding: 5 }), "created"));
show("hmac key encoding before digest", () => (createHmac("nope", "key", { encoding: "nope" }), "created"));
for (const key of [5, null, {}, true]) show(`hmac key ${JSON.stringify(key)}`, () => (createHmac("sha256", key), "created"));
show("hmac key before digest", () => (createHmac("nope", 5), "created"));

show("functionName", () => hash("shake128", "a", { functionName: "x" }));
show("customization", () => createHash("shake256", { customization: "x" }).digest("hex"));
show("customization sha256", () => createHash("sha256", { customization: "x" }).digest("hex"));
show("functionName NUL", () => hash("shake128", "a", { functionName: "a\0b" }));
show("customization Buffer NUL", () => createHash("shake128", { customization: Buffer.from([1, 0]) }).digest("hex"));
show("functionName number", () => hash("shake128", "a", { functionName: 5 }));
show("functionName null", () => hash("shake128", "a", { functionName: null }));
show("customization object", () => createHash("shake128", { customization: {} }).digest("hex"));
show("functionName unknown algorithm", () => hash("nope", "a", { functionName: "x" }));
show("functionName and encoding", () => hash("shake128", "a", { functionName: "x", outputEncoding: "nope" }));
show("functionName and length", () => createHash("shake128", { functionName: 5, outputLength: -1 }).digest("hex"));
show("copy ignores functionName", () => createHash("shake128").copy({ functionName: 5 }).digest("hex"));
show("createHash options string", () => createHash("shake128", /** @type {any} */ ("x")).digest("hex"));
show("createHash options null", () => createHash("shake128", null).digest("hex"));
show("outputLength string", () => createHash("shake128", { outputLength: "8" }).digest("hex"));
show("outputLength null", () => createHash("shake128", { outputLength: null }).digest("hex"));
show("hash outputLength string", () => hash("shake128", "a", { outputLength: "8" }));

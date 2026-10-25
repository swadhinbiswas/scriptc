// createCipheriv/createDecipheriv argument and state errors from
// JavaScript: argument types for the cipher, key, IV, options and data,
// unknown cipher names, key and IV lengths, authTagLength values, the
// ctsMode and xtsStandard options (no implemented cipher supports them), the
// invalid-state errors after final(), update() after final(), methods each
// direction lacks, and the encoding errors of update() and final(),
// including output encodings that are not strings.
import crypto from "node:crypto";

const key16 = Buffer.alloc(16, 1);
const iv12 = Buffer.alloc(12, 2);
const iv16 = Buffer.alloc(16, 3);

function attempt(label, run) {
  try {
    const result = run();
    console.log(label, "ok", Buffer.isBuffer(result) ? result.toString("hex") : typeof result);
  } catch (e) {
    console.log(label, e.name, e.code, e.message);
  }
}

attempt("cipher number", () => crypto.createCipheriv(5, key16, iv12));
attempt("cipher missing", () => crypto.createCipheriv());
attempt("unknown cipher", () => crypto.createCipheriv("aes-999-gcm", key16, iv12));
attempt("unknown spelling", () => crypto.createCipheriv("aes-128", key16, iv16));
attempt("key number", () => crypto.createCipheriv("aes-128-gcm", 5, iv12));
attempt("key object", () => crypto.createCipheriv("aes-128-gcm", {}, iv12));
attempt("key length", () => crypto.createCipheriv("aes-128-gcm", Buffer.alloc(15), iv12));
attempt("key length 256", () => crypto.createDecipheriv("aes-256-cbc", key16, iv16));
attempt("iv number", () => crypto.createCipheriv("aes-128-gcm", key16, 5));
attempt("iv undefined", () => crypto.createCipheriv("aes-128-cbc", key16, undefined));
attempt("iv null cbc", () => crypto.createCipheriv("aes-128-cbc", key16, null));
attempt("iv empty", () => crypto.createCipheriv("aes-128-gcm", key16, Buffer.alloc(0)));
attempt("iv cbc 15", () => crypto.createCipheriv("aes-128-cbc", key16, Buffer.alloc(15)));
attempt("iv ctr 17", () => crypto.createCipheriv("aes-128-ctr", key16, Buffer.alloc(17)));
attempt("authTagLength string", () => crypto.createCipheriv("aes-128-gcm", key16, iv12, { authTagLength: "16" }));
attempt("authTagLength negative", () => crypto.createCipheriv("aes-128-gcm", key16, iv12, { authTagLength: -1 }));
attempt("authTagLength fraction", () => crypto.createCipheriv("aes-128-gcm", key16, iv12, { authTagLength: 12.5 }));
attempt("authTagLength null", () => crypto.createCipheriv("aes-128-gcm", key16, iv12, { authTagLength: null }));
attempt("authTagLength cbc", () => crypto.createCipheriv("aes-128-cbc", key16, iv16, { authTagLength: 99 }));
attempt("encoding option", () => crypto.createCipheriv("aes-128-cbc", "0123456789abcdef", iv16, { encoding: 5 }));
attempt("key encoding hex", () => crypto.createCipheriv("aes-128-cbc", "000102030405060708090a0b0c0d0e0f", iv16, { encoding: "hex" }).final());
attempt("key encoding unknown", () => crypto.createCipheriv("aes-128-cbc", "0123456789abcdef", iv16, { encoding: "nope" }));
attempt("options number", () => crypto.createCipheriv("aes-128-gcm", key16, iv12, 5).final());
attempt("ctsMode cbc", () => crypto.createCipheriv("aes-128-cbc", key16, iv16, { ctsMode: "CS1" }));
attempt("ctsMode name case", () => crypto.createDecipheriv("AES-256-CBC", Buffer.alloc(32), iv16, { ctsMode: "CS3" }));
attempt("ctsMode gcm", () => crypto.createCipheriv("aes-128-gcm", key16, iv12, { ctsMode: "CS2" }));
attempt("ctsMode lowercase", () => crypto.createCipheriv("aes-128-cbc", key16, iv16, { ctsMode: "cs1" }));
attempt("ctsMode number", () => crypto.createCipheriv("aes-128-cbc", key16, iv16, { ctsMode: 1 }));
attempt("ctsMode null", () => crypto.createCipheriv("aes-128-cbc", key16, iv16, { ctsMode: null }).final());
attempt("ctsMode unknown cipher", () => crypto.createCipheriv("aes-999-cbc", key16, iv16, { ctsMode: "CS1" }));
attempt("ctsMode bad iv", () => crypto.createCipheriv("aes-128-cbc", key16, iv12, { ctsMode: "CS1" }));
attempt("ctsMode bad key", () => crypto.createCipheriv("aes-128-ctr", key16.subarray(1), iv16, { ctsMode: "CS1" }));
attempt("ctsMode bad tag", () => crypto.createCipheriv("aes-128-gcm", key16, iv12, { ctsMode: "CS1", authTagLength: 3 }));
attempt("ctsMode tag type", () => crypto.createCipheriv("aes-128-gcm", key16, iv12, { ctsMode: "CS9", authTagLength: "3" }));
attempt("xtsStandard chacha", () => crypto.createCipheriv("chacha20-poly1305", Buffer.alloc(32), iv12, { xtsStandard: "IEEE" }));
attempt("xtsStandard bad", () => crypto.createCipheriv("aes-128-ctr", key16, iv16, { xtsStandard: "ieee" }));
attempt("xtsStandard type before ctsMode value", () => crypto.createCipheriv("aes-128-ctr", key16, iv16, { ctsMode: "X", xtsStandard: 2 }));
attempt("ctsMode and xtsStandard", () => crypto.createCipheriv("aes-128-ctr", key16, iv16, { ctsMode: "CS1", xtsStandard: "GB" }));

const cipher = crypto.createCipheriv("aes-128-gcm", key16, iv12);
attempt("data number", () => cipher.update(5));
attempt("data array buffer", () => cipher.update(new ArrayBuffer(4)));
attempt("hex odd", () => cipher.update("abc", "hex"));
attempt("hex odd upper", () => cipher.update("abc", "HEX"));
attempt("unknown input encoding", () => cipher.update("abc", "nope"));
attempt("unknown output encoding", () => cipher.update("abc", "utf8", "nope"));
attempt("hex output", () => cipher.update("abc", "utf8", "hex"));
attempt("change encoding", () => cipher.update("abc", "utf8", "base64"));
const latin = crypto.createCipheriv("aes-128-ctr", key16, iv16);
attempt("binary output", () => latin.update("abc", "utf8", "binary"));
attempt("change encoding from binary", () => latin.update("abc", "utf8", "UTF-8"));
attempt("change encoding on final", () => latin.final("hex"));
attempt("buffer output", () => cipher.update("abc", "utf8", "buffer"));
attempt("getAuthTag early", () => cipher.getAuthTag());
attempt("final", () => cipher.final());
attempt("final again", () => cipher.final());
attempt("update after final", () => cipher.update("x"));
attempt("setAAD after final", () => cipher.setAAD(Buffer.from("x")));
attempt("setAutoPadding after final", () => cipher.setAutoPadding(true));
attempt("getAuthTag", () => cipher.getAuthTag());
attempt("setAuthTag on cipher", () => cipher.setAuthTag(Buffer.alloc(16)));

const decipher = crypto.createDecipheriv("aes-128-gcm", key16, iv12);
attempt("getAuthTag on decipher", () => decipher.getAuthTag());
attempt("setAuthTag number", () => decipher.setAuthTag(5));
attempt("setAuthTag length 3", () => decipher.setAuthTag(Buffer.alloc(3)));
attempt("setAuthTag length 17", () => decipher.setAuthTag(Buffer.alloc(17)));
attempt("setAuthTag string", () => decipher.setAuthTag("0123456789abcdef") && "set");
attempt("setAuthTag twice", () => decipher.setAuthTag(Buffer.alloc(16)));
attempt("setAAD type", () => decipher.setAAD(5));
attempt("setAAD plaintextLength", () => decipher.setAAD(Buffer.alloc(1), { plaintextLength: -5 }));
attempt("final mismatch", () => decipher.final());

const cbc = crypto.createDecipheriv("aes-128-cbc", key16, iv16);
attempt("setAAD cbc", () => cbc.setAAD(Buffer.from("x")));
attempt("setAuthTag cbc", () => cbc.setAuthTag(Buffer.alloc(16)));
attempt("final empty", () => cbc.final());
attempt("final empty again", () => cbc.final());

// Output encodings that are not strings print as Node's %s formats them.
class Encoding {
  constructor(name) {
    this.name = name;
  }
}
function outputEncoding(label, encoding) {
  attempt(`update output encoding ${label}`, () => crypto.createCipheriv("aes-128-ctr", key16, iv16).update("abc", "utf8", encoding));
  attempt(`final output encoding ${label}`, () => crypto.createCipheriv("aes-128-ctr", key16, iv16).final(encoding));
}
outputEncoding("object", { a: 1, b: [2, 3] });
outputEncoding("array", [1, "two", [3]]);
outputEncoding("instance", new Encoding("hex"));
outputEncoding("toString", { toString: () => "custom" });
outputEncoding("number", 12);
outputEncoding("boolean", true);
outputEncoding("empty object", {});
attempt("instance key", () => crypto.createCipheriv("aes-128-ctr", new Encoding("hex"), iv16));

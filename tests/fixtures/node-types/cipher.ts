import {
  type CipherGCM,
  type DecipherGCM,
  type KeyObject,
  createCipheriv,
  createDecipheriv,
  createSecretKey,
  getCiphers,
} from "node:crypto";

const key = Buffer.alloc(32, 1);
const iv = Buffer.alloc(12, 2);
const cipher: CipherGCM = createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
cipher.setAAD(Buffer.from("typed"));
const encrypted: Buffer = Buffer.concat([cipher.update("typed data", "utf8"), cipher.final()]);
const tag: Buffer = cipher.getAuthTag();
console.log(encrypted.toString("hex"), tag.toString("hex"));
const decipher: DecipherGCM = createDecipheriv("aes-256-gcm", key, iv);
decipher.setAAD(Buffer.from("typed")).setAuthTag(tag);
const text: string = decipher.update(encrypted, undefined, "utf8") + decipher.final("utf8");
console.log(text);
const cbc = createCipheriv("aes-128-cbc", Buffer.alloc(16, 3), Buffer.alloc(16, 4));
const hex: string = cbc.update("abc", "utf8", "hex") + cbc.final("hex");
const chacha = createCipheriv("chacha20-poly1305", key, iv);
const sealed: string = chacha.update(new Uint8Array([1, 2, 3]), undefined, "base64") + chacha.final("base64");
console.log(hex, sealed, chacha.getAuthTag().length, getCiphers().includes("chacha20-poly1305"));
const secret: KeyObject = createSecretKey(key);
const keyed = createCipheriv("aes-256-ctr", secret, Buffer.alloc(16, 5));
const viaKeyObject: string = keyed.update("typed key", "utf8", "hex") + keyed.final("hex");
const viaBuffer = createCipheriv("aes-256-ctr", key, Buffer.alloc(16, 5));
console.log(viaKeyObject === viaBuffer.update("typed key", "utf8", "hex") + viaBuffer.final("hex"));

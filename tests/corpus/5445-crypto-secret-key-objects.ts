// Secret KeyObjects: createSecretKey, generateKey and generateKeySync for
// hmac and aes, the KeyObject getters, export() and equals(), their use as
// createHmac and hkdf keys, and how they print.
import { createHmac, createSecretKey, generateKey, generateKeySync, hkdfSync, KeyObject } from "node:crypto";
import { inspect } from "node:util";

function errorText(err: Error | null): string {
  return err === null ? "null" : err.message;
}

function show(label: string, fn: () => string): void {
  try {
    console.log(label, fn());
  } catch (e) {
    const error = e as Error & { code?: string };
    console.log(label, "throws", error.name, error.code, error.message);
  }
}

const key = createSecretKey(Buffer.from("0123456789abcdef"));
show("type", () => key.type);
show("symmetricKeySize", () => String(key.symmetricKeySize));
show("asymmetricKeyType", () => String(key.asymmetricKeyType));
show("export", () => key.export().toString("hex"));
show("export buffer", () => key.export({ format: "buffer" }).toString());
show("export jwk", () => JSON.stringify(key.export({ format: "jwk" })));
show("export copies", () => {
  const exported = key.export();
  exported[0] = 0;
  return String(key.export()[0]);
});
show("source copied", () => {
  const source = Buffer.from("abcd");
  const copy = createSecretKey(source);
  source[0] = 0;
  return copy.export().toString();
});
show("equals", () => String(key.equals(createSecretKey(Buffer.from("0123456789abcdef")))));
show("equals differs", () => String(key.equals(createSecretKey(Buffer.from("0123456789abcdeX")))));
show("equals length", () => String(key.equals(createSecretKey(Buffer.from("01")))));
show("equals self", () => String(key.equals(key)));
show("from hex string", () => createSecretKey("6b6579", "hex").export().toString());
show("from latin1 string", () => createSecretKey("é", "latin1").export().toString("hex"));
show("from Uint16Array", () => String(createSecretKey(new Uint16Array([1, 2])).symmetricKeySize));
show("from DataView", () => String(createSecretKey(new DataView(new ArrayBuffer(5), 1, 3)).symmetricKeySize));
show("empty", () => String(createSecretKey(Buffer.alloc(0)).symmetricKeySize));
show("instanceof", () => String(key instanceof KeyObject));
show("Buffer instanceof", () => String((Buffer.from("x") as unknown) instanceof KeyObject));
show("String", () => String(key));
show("template", () => `${key}`);
show("JSON", () => JSON.stringify({ key }));
show("inspect", () => inspect(key));
show("inspect nested", () => inspect({ a: { b: { c: key } } }));
show("inspect deep", () => inspect({ a: { b: { c: { d: key } } } }));
show("inspect array", () => inspect([key, key]));
show("typeof", () => typeof key);
show("identity", () => String(key === createSecretKey(Buffer.from("0123456789abcdef"))));

show("hmac", () => createHmac("sha256", key).update("x").digest("hex"));
show("hmac bytes", () => createHmac("sha256", Buffer.from("0123456789abcdef")).update("x").digest("hex"));
show("hkdf", () => Buffer.from(hkdfSync("sha256", key, "salt", "info", 16)).toString("hex"));
show("hkdf bytes", () => Buffer.from(hkdfSync("sha256", "0123456789abcdef", "salt", "info", 16)).toString("hex"));

for (const length of [8, 63, 64, 256, 1024]) {
  show(`hmac ${length}`, () => {
    const generated = generateKeySync("hmac", { length });
    return `${generated.type} ${generated.symmetricKeySize}`;
  });
}
for (const length of [128, 192, 256]) {
  show(`aes ${length}`, () => String(generateKeySync("aes", { length }).symmetricKeySize));
}
show("aes distinct", () => String(!generateKeySync("aes", { length: 128 }).equals(generateKeySync("aes", { length: 128 }))));
show("hmac 7", () => String(generateKeySync("hmac", { length: 7 })));
show("hmac 2**31", () => String(generateKeySync("hmac", { length: 2 ** 31 })));
show("hmac fraction", () => String(generateKeySync("hmac", { length: 64.5 })));
show("aes 100", () => String(generateKeySync("aes", { length: 100 })));
show("jwk kty", () => String(key.export({ format: "jwk" }).kty));

const order: string[] = [];
generateKey("hmac", { length: 256 }, (err, generated) => {
  order.push(`hmac ${errorText(err)} ${generated.type} ${generated.symmetricKeySize} ${generated instanceof KeyObject}`);
  generateKey("aes", { length: 192 }, (err2, aes) => {
    order.push(`aes ${errorText(err2)} ${aes.symmetricKeySize}`);
    console.log(order.join("\n"));
  });
});
process.nextTick(() => order.push("tick"));
show("generateKey bad length", () => {
  generateKey("aes", { length: 1 }, () => {});
  return "no error";
});

// The states a Hash or Hmac passes through as a stream, as Node 24.22's
// native handle reports them: after the stream flushes, a Hash answers
// one more digest() with the same value and then throws "Digest already
// called", and update() throws ERR_CRYPTO_HASH_UPDATE_FAILED; an Hmac
// answers digest() with an empty string and update() with "Digest already
// called". A stream write after digest() fails with an 'error' event, and
// a flush after digest() pushes the same digest again. A copy of a Hash
// whose stream was destroyed gets a stream of its own.
import { createHash, createHmac } from "node:crypto";

function code(run: () => unknown): string {
  try {
    const value = run();
    return typeof value === "string" ? `ok ${value.slice(0, 16)}` : "ok";
  } catch (error) {
    const e = error as Error & { code?: string };
    return `${e.code} ${e.message}`;
  }
}

const hash = createHash("sha256");
hash.resume();
hash.on("finish", () => {
  console.log("hash update", code(() => hash.update("x")));
  console.log("hash digest", code(() => hash.digest("hex")));
  console.log("hash digest again", code(() => hash.digest("hex")));
  console.log("hash update after digest", code(() => hash.update("x")));
});
hash.end("abc");

const mac = createHmac("sha256", "key");
mac.resume();
mac.on("finish", () => {
  console.log("hmac update", code(() => mac.update("x")));
  console.log("hmac digest", JSON.stringify(mac.digest("hex")), JSON.stringify(mac.digest("base64")));
});
mac.end("abc");

const early = createHash("sha256");
early.write("a");
console.log("digest before end", early.digest("hex").slice(0, 16));
early.on("error", (error: Error & { code?: string }) => console.log("write after digest", error.code, error.message));
early.write("b");

const repeat = createHash("sha1");
repeat.update("abc");
const first = repeat.digest("hex");
repeat.on("data", (digest: Buffer) => console.log("flush after digest", digest.toString("hex") === first));
repeat.end();

const empty = createHash("md5");
empty.on("data", (digest: Buffer) => console.log("empty", digest.toString("hex")));
empty.on("end", () => console.log("empty end"));
empty.on("close", () => console.log("empty close"));
empty.end();

const closed = createHash("sha256");
closed.update("a");
closed.on("close", () => {
  const copy = closed.copy();
  copy.setEncoding("hex");
  copy.on("data", (digest: string) => console.log("copy of a closed stream", digest.slice(0, 16)));
  copy.end("b");
});
closed.destroy();

// createHash and createHmac values as streams: a Readable piped into a
// Hash with setEncoding("hex") delivers the digest as one 'data' string,
// write()/end() with a 'readable' listener reads it as a Buffer, an Hmac
// with setEncoding("base64") delivers it in Node's decoder chunks, and the
// callback and promise forms of pipeline() end into a Hash whose read()
// answers the digest. Writes and update() calls on one Hash combine.
import { createHash, createHmac } from "node:crypto";
import { pipeline } from "node:stream/promises";
import { pipeline as pipelineCallback, Readable } from "node:stream";

const chunks: Buffer[] = [];
for (let i = 0; i < 200; i++) chunks.push(Buffer.from("hello world\n".repeat(25)));

const piped = createHash("sha256");
Readable.from(chunks)
  .pipe(piped)
  .setEncoding("hex")
  .on("data", (digest: string) => console.log("pipe hex", digest))
  .on("end", () => console.log("pipe end"));

const written = createHash("sha1");
written.on("readable", () => {
  const digest = written.read();
  if (digest) console.log("readable", digest.toString("hex"));
});
written.write("hello ");
written.end("world");

const mac = createHmac("sha256", "key");
mac.setEncoding("base64");
mac.on("data", (chunk: string) => console.log("hmac chunk", chunk));
mac.on("finish", () => console.log("hmac finish"));
mac.end("payload");

const mixed = createHash("sha256");
mixed.update("a");
mixed.write("b");
mixed.end("c");
mixed.on("data", (digest: Buffer) => console.log("mixed", digest.equals(createHash("sha256").update("abc").digest())));

pipelineCallback(Readable.from(["x", "y"]), createHash("md5").setEncoding("hex"), (err?: Error | null) => {
  console.log("pipeline callback", err);
});

const awaited = createHash("sha512");
await pipeline(Readable.from(chunks), awaited);
console.log("pipeline", (awaited.read() as Buffer).toString("hex").slice(0, 32));
console.log("digest after pipeline", awaited.digest("hex").slice(0, 32));

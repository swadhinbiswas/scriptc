// fs streams from TypeScript: createReadStream/createWriteStream with
// literal options, the typed members, pipeline, for await, readline over a
// ReadStream, and the FileHandle streams and readLines.
import * as fs from "node:fs";
import { open, mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import * as readline from "node:readline";

async function main(): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "scr-fst-"));
  const file = join(dir, "lines.txt");
  await writeFile(file, "alpha\nbeta\r\ngamma\n\ndelta");

  const rs = fs.createReadStream(file, { highWaterMark: 6, start: 2, end: 20 });
  const seen: string[] = [];
  rs.on("open", (fd: number) => seen.push(`open ${fd >= 0}`));
  rs.on("ready", () => seen.push("ready"));
  rs.on("data", (chunk: Buffer) => seen.push(`data ${JSON.stringify(chunk.toString())}`));
  await new Promise<void>((resolve) => rs.on("close", () => resolve()));
  console.log(seen.join(" | "));
  console.log("bytesRead", rs.bytesRead, "pending", rs.pending, "path", rs.path === file);

  let text = "";
  for await (const chunk of fs.createReadStream(file, { encoding: "utf8", highWaterMark: 5 })) {
    text += `<${chunk}>`;
  }
  console.log("for await", text);

  const copy = join(dir, "copy.txt");
  const out = fs.createWriteStream(copy);
  await pipeline(fs.createReadStream(file), out);
  console.log("pipeline", out.bytesWritten, JSON.stringify(await readFile(copy, "utf8")));

  const rl = readline.createInterface({ input: fs.createReadStream(file), crlfDelay: Infinity });
  const lines: string[] = [];
  for await (const line of rl) lines.push(line);
  console.log("readline", JSON.stringify(lines));

  const ws = fs.createWriteStream(join(dir, "w.txt"), { flags: "w" });
  ws.write("one ");
  ws.write(Buffer.from("two "));
  await new Promise<void>((resolve) => ws.end("three", () => resolve()));
  await new Promise<void>((resolve) => ws.close(() => resolve()));
  console.log("ws", ws.bytesWritten, ws.pending, JSON.stringify(await readFile(join(dir, "w.txt"), "utf8")));

  const fh = await open(file);
  const fhs = fh.createReadStream({ start: 6, highWaterMark: 8 });
  const parts: string[] = [];
  fhs.on("data", (chunk: Buffer) => parts.push(chunk.toString()));
  await new Promise<void>((resolve) => fhs.on("close", () => resolve()));
  console.log("fh stream", JSON.stringify(parts), fhs.bytesRead, "fd after", fh.fd);
  await fh.close();

  const fh2 = await open(file);
  const fhLines: string[] = [];
  for await (const line of fh2.readLines()) fhLines.push(line);
  console.log("readLines", JSON.stringify(fhLines), "fd after", fh2.fd);

  const fh3 = await open(join(dir, "fh.txt"), "w");
  const fws = fh3.createWriteStream();
  fws.write("via ");
  await new Promise<void>((resolve) => fws.end("handle", () => resolve()));
  await new Promise<void>((resolve) => fws.on("close", () => resolve()));
  console.log("fh write", fws.bytesWritten, "fd after", fh3.fd, JSON.stringify(await readFile(join(dir, "fh.txt"), "utf8")));

  const fh4 = await open(file);
  const held = fh4.createReadStream({ autoClose: false });
  held.resume();
  await new Promise<void>((resolve) => held.on("end", () => resolve()));
  console.log("autoClose false", fh4.fd >= 0);
  const closing = fh4.close();
  await new Promise<void>((resolve) => held.on("close", () => resolve()));
  await closing;
  console.log("handle closed", fh4.fd);

  const fh5 = await open(file);
  const busy = fh5.createReadStream({ highWaterMark: 4 });
  busy.on("data", () => {});
  await fh5.close();
  console.log("closed under stream", fh5.fd, busy.destroyed);

  // A handle stream refused by its options leaves the handle's reference
  // count as it was: the handle still closes, and nothing leaks.
  const fh6 = await open(file);
  try {
    fh6.createReadStream({ encoding: "nope" as BufferEncoding });
  } catch (err) {
    console.log("handle stream refused", (err as NodeJS.ErrnoException).code);
  }
  await fh6.close();
  console.log("refused handle closed", fh6.fd);

  try {
    fs.createReadStream(file, { start: 3, end: 1 });
  } catch (err) {
    console.log("range", (err as Error).message);
  }
  fs.rmSync(dir, { recursive: true });
}

main();

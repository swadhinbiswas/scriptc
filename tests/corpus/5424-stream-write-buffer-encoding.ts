import { Writable } from "node:stream";

const seen: string[] = [];
const w = new Writable({
  write(chunk: Buffer, _enc, cb) {
    seen.push(chunk.toString());
    cb();
  },
});
console.log("buffer chunk", w.write(Buffer.from("ab"), "buffer"));
try {
  w.write("cd", "buffer");
} catch (err) {
  console.log((err as Error).name, (err as NodeJS.ErrnoException).code, (err as Error).message);
}
try {
  w.end("ef", "buffer");
} catch (err) {
  console.log("end", (err as NodeJS.ErrnoException).code);
}
w.end(Buffer.from("gh"), "buffer", () => console.log("ended", seen.join(",")));

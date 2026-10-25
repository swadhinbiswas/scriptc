// The dynamic Buffer.from paths (untyped strings, arrays, array-like
// objects, Buffer JSON and Buffers) after Buffer.poolSize grows before
// the first pooled allocation. Each case runs in a fresh child process;
// see 5531 for the typed paths.
import { spawnSync } from "node:child_process";

function describe(label, b) {
  let sum = 0;
  for (let i = 0; i < b.length; i++) sum = (sum + b[i] * (i + 1)) % 1000003;
  console.log(label, b.length, b.byteOffset, b.buffer.byteLength, sum);
  const next = Buffer.allocUnsafe(8);
  console.log("next", next.byteOffset, next.buffer.byteLength, next.buffer === b.buffer);
}

const values = () => {
  const out = [];
  for (let i = 0; i < 100000; i++) out.push(i % 251);
  return out;
};

const cases = {
  string: () => Buffer.from("y".repeat(100000)),
  "string-encoding": () => Buffer.from("0f".repeat(100000), "hex"),
  array: () => Buffer.from(values()),
  "array-like": () => {
    const like = { length: 100000 };
    for (let i = 0; i < 100000; i++) like[i] = i % 13;
    return Buffer.from(like);
  },
  "buffer-json": () => Buffer.from({ type: "Buffer", data: values() }),
  buffer: () => Buffer.from(Buffer.alloc(100000, 6)),
};

const mode = process.argv[2];
if (mode !== undefined) {
  Buffer.poolSize = 1024 * 1024;
  describe(mode, cases[mode]());
} else {
  for (const name of Object.keys(cases)) {
    const child = spawnSync(process.execPath, [process.argv[1], name], { encoding: "utf8" });
    console.log(`${name}: status ${child.status}`);
    process.stdout.write(child.stdout);
    if (child.stderr.length > 0) console.log(`stderr: ${child.stderr}`);
  }
}

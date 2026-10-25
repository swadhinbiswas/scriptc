import { closeSync, mkdtempSync, openSync, readFileSync, readSync, rmSync, writeFileSync } from "node:fs";
import { open, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = mkdtempSync(join(tmpdir(), "scriptc-read-storage-"));
const file = join(directory, "data.bin");
try {
  for (const size of [0, 1, 4095, 4096, 4097, 524288, 524289]) {
    const expected = Buffer.alloc(size);
    for (let i = 0; i < expected.length; i++) expected[i] = (i * 71 + 19) & 255;
    writeFileSync(file, expected);
    let data = readFileSync(file);
    const tail = data.subarray(Math.max(0, data.length - 3));
    const again = readFileSync(file);
    console.log(size, data.equals(expected), data.byteLength);
    if (data.length) data[0] = data[0]! ^ 255;
    console.log(again.equals(expected));
    data = Buffer.alloc(0);
    console.log(tail.toString("hex"));
    const fd = openSync(file, "r");
    try {
      const prefix = Buffer.alloc(11);
      const count = readSync(fd, prefix, 0, prefix.length, null);
      console.log(readFileSync(fd).equals(expected.subarray(count)), readFileSync(fd).length);
    } finally { closeSync(fd); }
  }
  const text = "a\u0000é😀\r\n".repeat(1800);
  writeFileSync(file, text);
  console.log(readFileSync(file, "utf8") === text);
  const descriptor = openSync(file, "r");
  try { console.log(readFileSync(descriptor, "utf8") === text, readFileSync(descriptor, "utf8")); }
  finally { closeSync(descriptor); }
  console.log((await readFile(file)).toString("utf8") === text);
  const handle = await open(file, "r");
  try { console.log((await handle.readFile()).toString("utf8") === text, (await handle.readFile()).length); }
  finally { await handle.close(); }
  for (const missing of [join(directory, "missing"), directory]) {
    try { readFileSync(missing); }
    catch (error) {
      if (error instanceof Error) console.log(error.name, (error as NodeJS.ErrnoException).code);
    }
  }
} finally { rmSync(directory, { recursive: true, force: true }); }

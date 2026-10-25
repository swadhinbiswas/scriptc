// Stored and computed options, defaults, and argument evaluation order.
import * as fs from "node:fs";
import { open, type FileReadOptions } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
const scratch = path.join(os.tmpdir(), `scr-3136-${process.pid}`);
let order = "";
function number(name: string, value: number): number { order += name; return value; }
function optional(): number | undefined { order += "u"; return process.pid < 0 ? 1 : undefined; }
async function main(): Promise<void> {
  fs.writeFileSync(scratch, "abcdef");
  const handle = await open(scratch, "r+");
  try {
    const buffer = Buffer.alloc(5, 46);
    const options = { position: 2, length: 2, offset: 1 };
    const first = await handle.read(buffer, options);
    console.log("stored options:", first.bytesRead, first.buffer === buffer, buffer.toString());
    const second = await handle.read({ position: number("p", 0), buffer, offset: number("o", 2), length: number("l", 3) });
    console.log("object options:", second.bytesRead, second.buffer === buffer, buffer.toString(), order);
    order = "";
    const source = Buffer.from("XYZ");
    console.log("write options:", (await handle.write(source, { position: number("p", 1), offset: number("o", 1), length: number("l", 2) })).bytesWritten, order);
    const defaults = { buffer: Buffer.alloc(2), offset: optional(), length: optional(), position: optional() };
    console.log("optional fields:", (await handle.read(defaults)).bytesRead, defaults.buffer.toString());
    const allocated = await handle.read({ position: 0, length: 3 });
    console.log("allocated:", allocated.buffer.length, allocated.bytesRead, allocated.buffer.subarray(0, 3).toString());
    const full = await handle.read();
    console.log("default read:", full.buffer.length, full.bytesRead, full.buffer.subarray(0, full.bytesRead).toString());
    const typed: FileReadOptions<Buffer> = { buffer: Buffer.alloc(3), position: 1, length: 2 };
    const typedResult = await handle.read(typed);
    console.log("typed options:", typedResult.bytesRead, typedResult.buffer.toString("hex"));
    order = "";
    const accessorOptions = { buffer, get position() { return number("p", 0); }, get offset() { return number("o", 1); }, get length() { return number("l", 2); } };
    console.log("getter options:", (await handle.read(accessorOptions)).bytesRead, order);
    const nothing = await handle.read({ buffer, offset: 99, length: 0, position: -1 });
    console.log("zero length:", nothing.bytesRead, nothing.buffer === buffer);
    try {
      await handle.read({ buffer, offset: 99, length: 0, position: -2 });
    } catch (e) {
      console.log("zero length position:", (e as Error).name, (e as Error).message);
    }
  } finally { await handle.close(); fs.unlinkSync(scratch); }
}
main();

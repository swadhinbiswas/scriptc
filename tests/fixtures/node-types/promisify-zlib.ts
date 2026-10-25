import * as zlib from "node:zlib";
import { promisify } from "node:util";

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const deflateRaw = promisify(zlib.deflateRaw);
const inflateRaw = promisify(zlib.inflateRaw);

const packed = await gzip("typed-zlib");
console.log(packed.subarray(0, 2).toString("hex"), (await gunzip(packed)).toString());
console.log((await inflateRaw(await deflateRaw(Buffer.from("raw-bytes")))).toString());
try {
  await gunzip(Buffer.from("not gzip"));
} catch (e) {
  if (e instanceof Error) console.log(e.message);
}

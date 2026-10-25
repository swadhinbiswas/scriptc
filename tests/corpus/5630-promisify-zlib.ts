// util.promisify over the zlib callback one-shots: the promise settles with
// the Buffer the callback form receives, or rejects with its Error (code
// and message), after the call returns. Options pass through; an invalid
// option rejects the promise instead of throwing. Compressed bytes are
// zlib-version-dependent, so every encoder is checked through a decoder and
// only stable format markers are printed.
import * as zlib from "node:zlib";
import { deflate, gunzip, gzip, inflate } from "node:zlib";
import { promisify } from "node:util";

const deflateAsync = promisify(deflate);
const inflateAsync = promisify(inflate);
const deflateRawAsync = promisify(zlib.deflateRaw);
const inflateRawAsync = promisify(zlib.inflateRaw);
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const unzipAsync = promisify(zlib.unzip);

const text = "the quick brown fox jumps over the lazy dog ☃".repeat(20);
const raw = Buffer.from(text, "utf8");

async function main(): Promise<void> {
  let returned = false;
  const pending = deflateAsync(text);
  returned = true;
  const packed = await pending;
  console.log("deflate", returned, packed.length > 0, packed.length < raw.length);
  console.log("inflate", (await inflateAsync(packed)).equals(raw));

  const rawPacked = await deflateRawAsync(raw);
  console.log("raw", (await inflateRawAsync(rawPacked)).toString() === text);

  const gzipped = await gzipAsync(text);
  console.log("gzip-header", gzipped.subarray(0, 2).toString("hex"));
  console.log("gunzip", (await gunzipAsync(gzipped)).equals(raw));
  console.log("unzip gzip", (await unzipAsync(gzipped)).equals(raw));
  console.log("unzip deflate", (await unzipAsync(packed)).equals(raw));

  const left = gzipAsync("left");
  const right = deflateAsync("right");
  const rightPlain = inflateAsync(await right);
  const leftPlain = gunzipAsync(await left);
  console.log("concurrent", (await leftPlain).toString(), (await rightPlain).toString());

  try {
    await inflateAsync(Buffer.from([1, 2, 3, 4]));
    console.log("SHOULD NOT PRINT");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.log("corrupt", err.name, err.code, err.message);
  }
  try {
    await unzipAsync(gzipped.subarray(0, gzipped.length - 4));
    console.log("SHOULD NOT PRINT");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.log("truncated", err.name, err.code, err.message);
  }
  const leveled = await gzipAsync(text, { level: 1 });
  console.log("options", (await gunzipAsync(leveled, { chunkSize: 1024 })).equals(raw));
  // Called outside the try: an invalid option rejects instead of throwing.
  const badLevel = gzipAsync(text, { level: 99 });
  try {
    await badLevel;
    console.log("SHOULD NOT PRINT");
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    console.log("bad level", err.name, err.code, err.message);
  }
  const notGzip = gunzipAsync(Buffer.from("not gzip"));
  await notGzip.catch((error: unknown) => {
    console.log("caught", error instanceof Error ? error.message : error);
  });
}

void main();

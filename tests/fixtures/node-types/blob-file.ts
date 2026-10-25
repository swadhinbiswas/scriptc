/* Blob and File under @types/node: the globals and node:buffer's classes
 * lower to the same native values as under the bundled declarations. */
import { Blob as BufferBlob, type BlobOptions, File as BufferFile } from "node:buffer";
import { inspect } from "node:util";

async function main(): Promise<void> {
  const options: BlobOptions = { type: "Text/Plain" };
  const blob = new Blob(["hello ", new Uint8Array([119, 111]), "rld"], options);
  const file = new BufferFile([blob], "greeting.txt", { lastModified: 42 });
  console.log(blob.size, blob.type, file.name, file.lastModified, file.size);
  console.log(await blob.text(), (await file.bytes()).length, (await file.arrayBuffer()).byteLength);
  console.log(await blob.slice(-5, -1, "X/Y").text(), blob.slice(1).type === "");
  console.log(blob instanceof BufferBlob, file instanceof Blob, file instanceof File);
  console.log(blob, inspect({ file }, { depth: 0 }));
  console.log(new BufferBlob(["module"]).size, String(file), JSON.stringify(blob));
  const clone = structuredClone(file);
  console.log(clone === file, clone.name, await clone.text());
}

void main();

// How Blob and File values print and serialize: util.inspect's
// `Blob { size, type }` and `File { size, type, name, lastModified }`
// forms (nested, past the depth limit, wrapped, and from
// unknown storage), String() and template literals, JSON.stringify,
// Object.keys, and structuredClone (a new object over the same bytes).
import { inspect } from "node:util";

const blob = new Blob(["abcd"], { type: "Text/Plain" });
const file = new File(["x"], "n.txt", { lastModified: 7 });
console.log(blob);
console.log(file);
console.log([blob, file]);
console.log({ blob, nested: { file } });
console.log(new Map([["k", blob]]));
console.log(inspect({ a: blob }, { depth: 0 }));
console.log(inspect([[file]], { depth: 1 }));
console.log(inspect({ a: { b: blob } }, { depth: 1 }));
console.log([
  new File(["long content here"], "a-very-long-file-name-for-wrapping.txt", {
    type: "application/octet-stream",
    lastModified: 1700000000000,
  }),
]);

const stored: unknown = file;
console.log(stored);
console.log(String(blob), `${file}`, Object.prototype.toString.call(blob), blob.toString(), file.toString());
console.log(JSON.stringify(blob), JSON.stringify({ file, list: [blob] }));
console.log(Object.keys(blob), Object.keys(file).length);

const clone = structuredClone(file);
console.log(clone === file, clone instanceof File, clone.name, clone.lastModified, clone.size);
console.log(structuredClone({ inside: [blob] }));
clone.text().then((text) => console.log("clone text", text));

// Blob and File construction: every source kind (strings, typed arrays,
// DataView, ArrayBuffer, Buffer, nested Blobs), the copy taken at
// construction, the type rule (lowercased, cleared by characters outside
// U+0020..U+007E), line endings, and File's name and lastModified.
import { Blob as BufferBlob, File as BufferFile } from "node:buffer";

const bytes = new Uint8Array([104, 105]);
const wide = new Uint16Array([0x6261]);
const buffer = new ArrayBuffer(3);
new Uint8Array(buffer).set([1, 2, 3]);
const view = new DataView(buffer, 1, 2);
const parts = new Blob(["ab", bytes, wide, buffer, view, Buffer.from("xyz")]);
console.log(parts.size, parts.type === "");

// Sources are copied: later writes do not reach the Blob.
const source = new Uint8Array([1, 2, 3]);
const copied = new Blob([source]);
source[0] = 99;
copied.bytes().then((out) => console.log("copied", Array.from(out).join(",")));

// A Blob part contributes its bytes.
const inner = new Blob(["in", "ner"]);
const outer = new Blob([inner, "-", inner]);
outer.text().then((text) => console.log("outer", text, outer.size));

// Empty forms.
console.log(new Blob().size, new Blob([]).size, new Blob([""]).size, new Blob(undefined).size);

// The type: lowercased, or empty when any character is outside 0x20..0x7e.
for (const type of ["Text/Plain", "application/JSON; charset=UTF-8", "a\tb", "café", "", " x "]) {
  console.log(JSON.stringify(new Blob([], { type }).type));
}

// endings: "transparent" keeps line breaks, "native" turns CRLF, CR and LF
// into the platform's.
const eol = process.platform === "win32" ? "\r\n" : "\n";
const text = "a\nb\r\nc\rd";
const transparent = new Blob([text], { endings: "transparent" });
const native = new Blob([text], { endings: "native" });
console.log(transparent.size, native.size === text.replace(/\r\n|\r|\n/g, eol).length);
native.text().then((t) => console.log("native", JSON.stringify(t) === JSON.stringify(text.replace(/\r\n|\r|\n/g, eol))));

// Non-ASCII and lone surrogates encode as UTF-8 (lone surrogates as U+FFFD).
const unicode = new Blob(["é中😀", "\ud800"]);
console.log(unicode.size);
unicode.text().then((t) => console.log("unicode", t.length, t.codePointAt(t.length - 1)?.toString(16)));

// File: name, lastModified, and the Blob members.
const file = new File(["hello"], "notes.txt", { type: "Text/Markdown", lastModified: 1700000000000 });
console.log(file.name, file.size, file.type, file.lastModified);
console.log(new File([], "lone\ud800name").name === "lone�name");
console.log(new File([], "zero", { lastModified: 0 }).lastModified);
const now = new File([], "now");
console.log(typeof now.lastModified, Math.abs(Date.now() - now.lastModified) < 60000);

// instanceof across the global and node:buffer spellings.
console.log(file instanceof File, file instanceof Blob, parts instanceof File, parts instanceof Blob);
const fromModule = new BufferBlob(["m"]);
const fileFromModule = new BufferFile(["m"], "m.txt");
console.log(fromModule instanceof Blob, fileFromModule instanceof File, fileFromModule instanceof BufferBlob);
const values: unknown[] = [parts, file, "blob", null, new Uint8Array(1)];
console.log(values.map((v) => `${v instanceof Blob}/${v instanceof File}`).join(" "));

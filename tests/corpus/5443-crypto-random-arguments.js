// randomFillSync and randomFill over ArrayBuffers and values of other
// types, and the UUID options checks, in JavaScript.
import { randomFill, randomFillSync, randomUUID, randomUUIDv7 } from "node:crypto";

const show = (label, fn) => {
  try {
    console.log(label, fn());
  } catch (e) {
    console.log(label, "throws", e.name, e.code, e.message);
  }
};
/** @param {ArrayBuffer} buffer */
const changed = (buffer) => {
  let out = "";
  for (const b of new Uint8Array(buffer)) out += b === 0 ? "0" : "1";
  return out;
};

const storage = new ArrayBuffer(8);
show("ArrayBuffer", () => {
  const result = randomFillSync(storage, 4);
  return [result === storage, changed(storage).slice(0, 4)].join(" ");
});
show("ArrayBuffer offset past end", () => randomFillSync(new ArrayBuffer(8), 9));
show("ArrayBuffer size past end", () => randomFillSync(new ArrayBuffer(8), 0, 9));
show("SharedArrayBuffer", () => randomFillSync(new SharedArrayBuffer(16)).byteLength);
show("offset string", () => randomFillSync(new Uint8Array(4), "1"));
show("size string", () => randomFillSync(new Uint8Array(4), 0, "1"));
show("offset undefined", () => randomFillSync(new Uint8Array(4), undefined).length);
show("size undefined", () => randomFillSync(new Uint8Array(4), 1, undefined).length);
show("number", () => randomFillSync(5));
show("array", () => randomFillSync([1, 2]));
show("null", () => randomFillSync(null));
show("object", () => randomFillSync({}));
show("fill number", () => randomFill(5, () => {}));
show("fill offset string", () => randomFill(new Uint8Array(4), "1", () => {}));
show("fill offset past end", () => randomFill(new ArrayBuffer(4), 5, () => {}));

const steps = [
  (next) => randomFill(storage, (err, buf) => {
    console.log("fill ArrayBuffer", err, buf === storage, buf.byteLength);
    next();
  }),
  (next) => randomFill(new ArrayBuffer(16), 12, (err, buf) => {
    console.log("fill ArrayBuffer offset", err, changed(buf).slice(0, 12));
    next();
  }),
  (next) => randomFill(new ArrayBuffer(16), 4, undefined, (err, buf) => {
    console.log("fill size undefined", err, changed(buf).slice(0, 4));
    next();
  }),
  (next) => randomFill(new ArrayBuffer(16), 4, 0, (err, buf) => {
    console.log("fill empty", err, buf.byteLength);
    next();
  }),
];
const run = (i) => {
  if (i < steps.length) steps[i](() => run(i + 1));
};
run(0);

for (const options of [undefined, {}, { disableEntropyCache: true }, { disableEntropyCache: undefined }]) {
  show(`uuid ${JSON.stringify(options)}`, () => randomUUID(options).length);
  show(`uuidv7 ${JSON.stringify(options)}`, () => randomUUIDv7(options)[14]);
}
for (const options of [null, 5, "x", [], { disableEntropyCache: "yes" }, { disableEntropyCache: 1 }]) {
  show(`uuid bad ${JSON.stringify(options)}`, () => randomUUID(options));
  show(`uuidv7 bad ${JSON.stringify(options)}`, () => randomUUIDv7(options));
}
console.log("sync done");

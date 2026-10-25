// Blob and File values through untyped code: members read and called on
// values whose static type is unknown (function parameters, array and
// object slots) behave like the typed forms, including slice(), the three
// readers, their settle order, and the TypeError for a missing method.
function describe(value) {
  return `${value.size}:${JSON.stringify(value.type)}:${value.name}:${value.lastModified}`;
}

async function readAll(value) {
  const text = await value.text();
  const bytes = await value.bytes();
  const buffer = await value.arrayBuffer();
  return [text, bytes.length, bytes[0], buffer.byteLength, buffer instanceof ArrayBuffer];
}

async function main() {
  const shelf = [new Blob(["dyn", "amic"], { type: "Text/X" }), new File(["file"], "a.txt", { lastModified: 3 })];
  const box = { blob: shelf[0], file: shelf[1] };
  for (const item of shelf) console.log(describe(item));
  console.log(await readAll(box.blob));
  console.log(await readAll(box.file));
  const part = box.blob.slice(1, -1, "A/B");
  console.log(describe(part), await part.text(), part instanceof Blob);
  console.log(box.file.slice(0, 2) instanceof File);

  // Settlement order through the dynamic path matches the typed one.
  const order = [];
  await Promise.all([
    box.blob.text().then(() => order.push("blob text")),
    box.file.arrayBuffer().then(() => order.push("file buffer")),
    Promise.resolve().then(() => order.push("plain")),
  ]);
  console.log(order.join(", "));

  try {
    box.blob.missing();
  } catch (error) {
    console.log(error instanceof TypeError, error.message);
  }
  console.log(box);
}

main();

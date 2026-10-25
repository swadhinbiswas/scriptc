// Blob readers and slice(): text() decodes UTF-8 with replacement and
// strips a leading BOM, bytes() answers a Uint8Array, arrayBuffer() an
// ArrayBuffer; slice() takes relative and negative offsets (rounded half to
// even), clamps, and lowercases its content type. Each read returns a fresh
// copy.
async function main(): Promise<void> {
  const blob = new Blob(["hello ", "world"], { type: "text/plain" });
  console.log(await blob.text());
  const bytes = await blob.bytes();
  console.log(bytes.length, bytes[0], bytes instanceof Uint8Array);
  bytes[0] = 0;
  console.log((await blob.bytes())[0]);
  const ab = await blob.arrayBuffer();
  console.log(ab instanceof ArrayBuffer, ab.byteLength, Buffer.from(ab).toString());

  // Decoding: invalid sequences become U+FFFD and the BOM is dropped.
  const bom = new Blob([new Uint8Array([0xef, 0xbb, 0xbf, 0x68, 0x69, 0xff, 0xc3])]);
  console.log(JSON.stringify(await bom.text()));
  console.log((await bom.bytes()).length);

  // slice(start, end, contentType).
  const s = new Blob(["0123456789"]);
  const cases: [number | undefined, number | undefined][] = [
    [undefined, undefined],
    [2, undefined],
    [2, 5],
    [-3, undefined],
    [-3, -1],
    [5, 2],
    [0, 100],
    [100, 200],
    [1.9, 4.2],
    [2.5, 3.5],
    [0.5, -1.5],
    [-100, 3],
    [NaN, Infinity],
    [-Infinity, 4],
  ];
  for (const [start, end] of cases) {
    const part = s.slice(start, end);
    console.log(String(start), String(end), part.size, JSON.stringify(await part.text()));
  }
  console.log(JSON.stringify(s.slice(0, 1, "Image/PNG").type), JSON.stringify(s.slice(0, 1, "é").type));
  console.log(JSON.stringify(new Blob([], { type: "a/b" }).slice().type));

  // A slice of a slice, and slices of multi-part Blobs.
  const multi = new Blob(["ab", new Uint8Array([99, 100]), "ef"]);
  console.log(await multi.slice(1, 5).text(), await multi.slice(1).slice(2, 4).text());

  // File.slice answers a Blob.
  const file = new File(["file data"], "f.bin", { lastModified: 5 });
  const head = file.slice(0, 4);
  console.log(head instanceof File, head instanceof Blob, await head.text());

  // Reading the same Blob concurrently.
  const [a, b] = await Promise.all([blob.text(), blob.slice(6).text()]);
  console.log(a, b);
}

main().catch((error: unknown) => console.log("failed", error));

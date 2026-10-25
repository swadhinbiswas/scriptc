// Encoders and decoders agree on complete groups, tails, byte windows and
// retained results, including after another conversion reuses freed storage.
const data = Buffer.alloc(259);
for (let i = 0; i < data.length; i++) data[i] = i & 255;
const encodings: BufferEncoding[] = ["hex", "base64", "base64url", "ascii", "latin1"];
for (const encoding of encodings) {
  for (const length of [0, 1, 2, 3, 4, 7, 8, 9, 31, 32, 33, 255, 256, 259]) {
    const window = data.subarray(0, length);
    const encoded = window.toString(encoding);
    const decoded = Buffer.from(encoded, encoding);
    console.log(encoding, length, JSON.stringify(encoded), decoded.toString("hex"));
    console.log("range", data.toString(encoding, 1, length));
  }
}
for (const text of ["", "Y", "YQ", "YWI", "YWJj", "YQ==Yg==", "Y=Q", "YQ=Y", "YQ!Yg", " Y W\nJj\tZA==ignored", "-_+/", "ŁŁ", "Ĵı", "YQ😀Yg", "a1g2", "abc", "\0YWJj"]) {
  console.log(JSON.stringify(text), Buffer.from(text, "base64").toString("hex"), Buffer.from(text, "base64url").toString("hex"), Buffer.from(text, "hex").toString("hex"));
}
for (const text of ["", "plain ASCII", "héllo 世界 😀", "\0\u007f\u0080\u07ff\u0800\uffff", "𐀀􏿿"]) {
  const bytes = Buffer.from(text, "utf16le");
  console.log("utf16", bytes.toString("hex"), JSON.stringify(bytes.toString("utf16le")));
  console.log("odd", JSON.stringify(Buffer.concat([bytes, Buffer.from([255])]).toString("utf16le")));
}
const retained = data.toString("base64");
for (let i = 0; i < 10; i++) console.log(data.toString("hex").length);
console.log("retained", retained, data.toString("base64"));
const independent = Buffer.from(retained, "base64");
independent[0] = 99;
console.log("independent", data[0], independent[0], retained);
function fromText(source: string, encoding?: BufferEncoding): Buffer {
  return Buffer.from(source, encoding);
}
for (const encoding of ["HEX", "BASE64", "binary", "ucs-2", "", "unknown", "\0unknown"] as BufferEncoding[]) {
  for (const source of ["", "6162"]) {
    try {
      console.log("variable", JSON.stringify(encoding), source, fromText(source, encoding).toString("hex"));
    } catch (error) {
      if (error instanceof Error) console.log(error.name, (error as NodeJS.ErrnoException).code, JSON.stringify(error.message));
    }
  }
}
console.log("optional", fromText("hé").toString("hex"), Buffer.from("hé", undefined).toString("hex"));
let order = "";
function source(): string { order += "source;"; return "61"; }
function encoding(): BufferEncoding { order += "encoding;"; return "hex"; }
console.log(Buffer.from(source(), encoding()).toString(), order);
console.log(Buffer.from(source(), void (order += "undefined;")).toString(), order);
// Fixed-width writes stop at the destination's unit boundary. A UTF-16
// surrogate pair may split, while a UTF-8 scalar must stay complete.
for (const text of ["", "abcdefghi", "é世😀z", "😀a", "a\0b"]) {
  for (let budget = 0; budget < 14; budget++) {
    const utf8 = Buffer.alloc(18, 255);
    const utf16 = Buffer.alloc(18, 255);
    const latin = Buffer.alloc(18, 255);
    const ascii = Buffer.alloc(18, 255);
    console.log("write", JSON.stringify(text), budget,
      utf8.write(text, 2, budget, "utf8"), utf8.toString("hex"),
      utf16.write(text, 2, budget, "utf16le"), utf16.toString("hex"),
      latin.write(text, 2, budget, "latin1"), latin.toString("hex"),
      ascii.write(text, 2, budget, "ascii"), ascii.toString("hex"));
  }
}
function literalEncoding(): "hex" { order += "literal;"; return "hex"; }
console.log(Buffer.from(source(), literalEncoding()).toString(), order);
console.log(Buffer.from("a").toString(literalEncoding()), order);

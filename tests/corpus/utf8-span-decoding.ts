import { isUtf8 } from "node:buffer";

const sequences = [
  "", "00", "c2a2", "e282ac", "f09f9880", "efbbbf", "c0af", "eda080",
  "f4908080", "e282", "f09f98", "e228a1", "f0908041", "80", "ff",
];
for (const prefix of [0, 1, 7, 8, 15, 16, 31]) {
  for (const sequence of sequences) {
    for (const suffix of ["", "00c2a2", "ff61"]) {
      const input = Buffer.concat([
        Buffer.from("a".repeat(prefix)), Buffer.from(sequence + suffix, "hex"),
      ]);
      const decoded = input.toString("utf8");
      const ordinary = new TextDecoder("utf-8", { ignoreBOM: true }).decode(input);
      let strict = "valid";
      try { new TextDecoder("utf-8", { fatal: true }).decode(input); }
      catch (error) { strict = (error as Error).name; }
      console.log(prefix, sequence, suffix, JSON.stringify(decoded), decoded === ordinary, isUtf8(input), strict);
    }
  }
}

const text = "header\0café κόσμος 😀\n".repeat(32);
const bytes = Buffer.from(text);
for (const width of [1, 2, 3, 7, 8, 15, 16, 31]) {
  const decoder = new TextDecoder();
  let result = "";
  for (let start = 0; start < bytes.length; start += width)
    result += decoder.decode(bytes.subarray(start, start + width), { stream: true });
  result += decoder.decode();
  console.log("stream", width, result === text);
}

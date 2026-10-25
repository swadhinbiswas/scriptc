// Encoding a string to bytes writes each lone surrogate as U+FFFD in UTF-8
// (same byte length), as its own code unit in UTF-16LE, and as its low byte
// in latin1. Decoding UTF-16LE keeps lone units; decoding UTF-8 never
// produces a lone surrogate.
import { StringDecoder } from "node:string_decoder";

const smile: string = "🙂";
const high: string = "\uD83D";
const low: string = "\uDE42";
const text = "a" + high + "b" + low + "c" + smile;

function units(s: string): string {
  const out: string[] = [];
  for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i).toString(16));
  return out.join(" ");
}

console.log("utf8", Buffer.from(text).toString("hex"), Buffer.from(text, "utf8").length, Buffer.byteLength(text));
console.log("utf16le", Buffer.from(text, "utf16le").toString("hex"), Buffer.byteLength(text, "utf16le"));
console.log("latin1", Buffer.from(text, "latin1").toString("hex"), Buffer.from(text, "ascii").toString("hex"));
console.log("base64", Buffer.from(text).toString("base64"), Buffer.from(high + low).toString("base64"));
console.log("rejoined", Buffer.from(smile.split("").join("")).toString("hex"));

const target = Buffer.alloc(12);
const written = target.write(high + "xy" + low, 1);
console.log("write", written, target.toString("hex"));
console.log("write utf16le", Buffer.alloc(6).fill(0).write(low + high, "utf16le"));
console.log("fill", Buffer.alloc(7).fill(high + "z").toString("hex"));
console.log("concat", Buffer.concat([Buffer.from(high), Buffer.from(low)]).toString("hex"));

const encoder = new TextEncoder();
console.log("encode", Array.from(encoder.encode(text)).join(","));
const into = new Uint8Array(8);
const result = encoder.encodeInto(high + "abc" + low, into);
console.log("encodeInto", result.read, result.written, Array.from(into).join(","));

console.log("decode utf8", units(Buffer.from([0xed, 0xa0, 0x80, 0x41]).toString("utf8")), units(new TextDecoder().decode(new Uint8Array([0xed, 0xb9, 0x82]))));
console.log("decode utf16le", units(Buffer.from([0x3d, 0xd8, 0x41, 0x00]).toString("utf16le")), units(Buffer.from([0x42, 0xde, 0x3d, 0xd8]).toString("utf16le")));
console.log("decode pair", Buffer.from([0x3d, 0xd8, 0x42, 0xde]).toString("utf16le") === smile);
console.log("round trip", Buffer.from(text, "utf16le").toString("utf16le") === text, Buffer.from(text).toString() === text);

const decoder = new StringDecoder("utf16le");
const first = decoder.write(Buffer.from([0x41, 0x00, 0x3d, 0xd8]));
const second = decoder.write(Buffer.from([0x42, 0xde]));
console.log("string decoder", units(first), units(second), first + second === "A" + smile);
const lone = new StringDecoder("utf16le");
console.log("string decoder end", units(lone.write(Buffer.from([0x3d, 0xd8]))), units(lone.end()));

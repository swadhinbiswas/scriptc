// Indexed scans of non-ASCII strings read UTF-16 units from a cached copy
// once enough reads warrant it; appends, releases and a second receiver
// must all keep those reads exact. Fresh concatenations format integers
// directly into the result, and split("") sizes its array up front.
export {};

function checksum(s: string): number {
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum = (sum * 31 + s.charCodeAt(i)) | 0;
  return sum;
}

function probe(s: string): string {
  const out: string[] = [];
  for (const i of [-1, 0, 1, 2.5, s.length - 1, s.length, s.length + 3, NaN]) {
    out.push(`${s.charCodeAt(i)}/${s.charAt(i).length}/${s.charAt(i) === s[i]}`);
  }
  return out.join(" ");
}

let text = "naïve café 日本語 🙂 ".repeat(300);
console.log("scan", text.length, checksum(text), checksum(text));
console.log("probe", probe(text));

// Appending in place drops the cached units; reads see the new tail.
for (let round = 0; round < 3; round++) {
  text += "Ω" + round + "🙂";
  console.log("append", round, text.length, checksum(text), text.charCodeAt(text.length - 1), text.charCodeAt(text.length - 3));
}

// Alternating receivers and a released receiver whose memory is reused.
let other = "ÆØÅ αβγ ".repeat(500);
let mixed = 0;
for (let i = 0; i < 4000; i++) mixed = (mixed + text.charCodeAt(i % text.length) * 3 + other.charCodeAt(i % other.length)) | 0;
console.log("alternate", mixed);
for (let round = 0; round < 4; round++) {
  other = (round % 2 === 0 ? "ŁŻŹ " : "çãõ ").repeat(500 + round);
  console.log("replaced", round, other.length, checksum(other), other.charAt(2), other.charCodeAt(other.length - 1));
}

// Halves of astral characters through the unit copy.
const astral = "𝄞x😀".repeat(400);
let halves = 0;
for (let i = 0; i < astral.length; i++) halves = (halves + astral.charCodeAt(i)) | 0;
console.log("astral", astral.length, halves, astral.charCodeAt(0).toString(16), astral.charCodeAt(1).toString(16), astral.charAt(1).charCodeAt(0).toString(16));

// Integer formatting into fresh concatenations.
for (const n of [0, -0, 1, 9, 10, 99, 100, 65535, 4294967295, 4294967296, -1, 1.5, 1e21, 123456789012, -2147483648, 0.1]) {
  console.log("number", `${n}`, `<${n}|${n * 2}>`, `é${n}`.length);
}

// split("") with and without a limit, ASCII and not.
console.log("split", "abc".split("").join("|"), "abcdef".split("", 3).join("|"), "é😀x".split("").length, "é😀x".split("", 2).length);
const big = "the quick brown fox ".repeat(100).split("");
console.log("split big", big.length, big[0], big[big.length - 1] === " ", big.join("").length);

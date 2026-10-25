// Non-ASCII receivers: all indices are UTF-16 code units (JS-exact) over the
// runtime's UTF-8 storage. CJK is 1 code unit per char, astral (emoji) is 2,
// combining marks are their own units. charAt/slice boundaries here never
// split a surrogate pair; 4991-lone-surrogate-halves covers the halves a
// split produces.

// CJK: one code unit per character
const cjk: string = "你好，世界";
console.log(cjk.length, cjk.charCodeAt(0), cjk.charCodeAt(4));
console.log(cjk.charAt(1), cjk.slice(3), cjk.slice(0, 2), cjk.slice(-2));
console.log(cjk.indexOf("世"), cjk.indexOf("你", 1), cjk.includes("，世"));
console.log(cjk.startsWith("你好"), cjk.endsWith("世界"), "好".repeat(3));

// Astral: 🎉 is U+1F389 = two code units (surrogate pair)
const party: string = "a🎉b🎉c";
console.log(party.length, "🎉".length);
console.log(party.charCodeAt(1), party.charCodeAt(2), party.charCodeAt(3));
console.log(party.charAt(0), party.charAt(3), party.slice(1, 3), party.slice(3));
console.log(party.indexOf("🎉"), party.indexOf("🎉", 2), party.indexOf("b"));
console.log(party.includes("🎉b"), party.startsWith("a🎉"), party.endsWith("🎉c"));

// Modifier sequences: thumbs-up + skin tone is two astral code points = 4 units
const thumbs: string = "\u{1F44D}\u{1F3FD}";
console.log(thumbs.length, thumbs.indexOf("\u{1F3FD}"), thumbs.slice(2) === "\u{1F3FD}");

// Combining marks: "é" as e + U+0301 is 2 units; precomposed U+00E9 is 1
const decomposed: string = "e\u0301clair";
const precomposed: string = "\u00E9clair";
console.log(decomposed.length, precomposed.length, decomposed === precomposed);
console.log(decomposed.charCodeAt(1), decomposed.charAt(1), decomposed.slice(0, 2));
console.log(decomposed.indexOf("clair"), precomposed.indexOf("clair"));
console.log(decomposed.startsWith("e"), precomposed.startsWith("e"));

// trim leaves non-ASCII interiors alone; NBSP, FEFF and the ideographic
// space (U+3000) are all JS whitespace
console.log("\u00A0 \t\u4F60\u597D \u{1F389}\u3000\uFEFF".trim());

// .length in loop conditions and arithmetic (BMP-only charAt in the loop)
const word: string = "héllo";
let codes: string = "";
for (let i = 0; i < word.length; i++) {
  codes = codes + word.charCodeAt(i) + " ";
}
console.log(codes.trim(), word.length * 2 - 1);

// counting astral characters via surrogate arithmetic
let pairs = 0;
let i = 0;
while (i < party.length) {
  const cu = party.charCodeAt(i);
  if (cu >= 55296 && cu <= 56319) {
    pairs++;
    i += 2;
  } else {
    i += 1;
  }
}
console.log("pairs:", pairs, "of", party.length, "units");

// chains and template-literal receivers with non-ASCII pieces
console.log(cjk.slice(0, 2).repeat(2), `${cjk.charAt(0)}${party.slice(1, 3)}`.length);
console.log(`  ${"🎉".repeat(2)}  `.trim(), `${cjk} ${party}`.indexOf("🎉"));

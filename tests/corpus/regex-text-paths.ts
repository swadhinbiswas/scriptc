// Exercise shared regex input paths at word and prior short-subject boundaries.
for (const length of [0, 1, 7, 8, 9, 255, 256, 257, 4096]) {
  for (const suffix of ["", "é", "😀", "\0"]) {
    const text = "a".repeat(length) + suffix + "b42";
    const pattern = /b(\d+)(x)?/g;
    const match = pattern.exec(text);
    console.log(length, suffix, match?.[0], match?.[1], match?.[2], pattern.lastIndex);
    console.log(pattern.test(text), pattern.lastIndex, text.search(/b\d+/));
    console.log(text.replace(/b(\d+)(x)?/g, "<$1:$2:$$:$&>"));
    console.log(text.replace(/z/g, "unmatched"), text.split(/(b)(\d+)(x)?/, 4));
    console.log(text.match(/\d+/g));
    for (const item of text.matchAll(/b(\d+)(x)?/g)) console.log(item.index, item[1], item[2]);
  }
}

// The executor needs more registers than the number of captures alone.
const many = /(a)(b)(c)(d)(e)(f)(g)(h)(i)(j)(k)(l)(m)(n)(o)(p)(q)(r)/g;
console.log(JSON.stringify(many.exec("abcdefghijklmnopqr")), many.lastIndex);
console.log("abcdefghijklmnopqr".replace(many, "$18-$1-$99"));
console.log("xabcdefghijklmnopqry".split(many, 5));

const sticky = /b/y;
sticky.lastIndex = 200;
console.log("abc".replace(sticky, "x"), sticky.lastIndex);
sticky.lastIndex = 1;
console.log("abc".replace(sticky, "long literal\0tail"), sticky.lastIndex);
console.log("abc".replace(/b/, "a long literal prefix $1 unknown $ and trailing $"));
console.log("abc".replace(/b/, "literal\0tail"));
console.log("a\0b".replace(/\0/g, "[$&]"));
console.log("ab".replace(/(?:)/gu, "-"), "😀b".replace(/(?:)/gu, "-"));
console.log("ab".split(/(?:)/u), "😀b".split(/(?:)/u));
console.log(/ſ/iu.test("s"), /K/iu.test("k"), /ſ/i.test("s"));

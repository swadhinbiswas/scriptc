// Native regex matchers for anchors (with and without m), word boundaries,
// character classes and their escapes, the dot with and without s, and
// ASCII case folding under i (with and without u).
export {};

function all(re: RegExp, s: string): string {
  return JSON.stringify(s.match(re));
}

// $ only matches at the very end without m (also before a final newline:
// no), and at each line end with m. ^ likewise.
console.log(/a$/.test("a\n"), /a$/m.test("a\n"), /a$/m.test("a\r\nb"), /^b/m.test("a\rb"));
console.log(all(/^\w+$/gm, "one\ntwo\r\nthree\rfour\n"), all(/\w+$/g, "one\ntwo"));
console.log(all(/^/gm, "a\n\nb"), all(/$/gm, "a\n\nb"), "a\nb\n".replace(/$/gm, ";"));
console.log(all(/^\d|\d$/g, "12 34"), /^$/.test(""), /^$/m.test("a\n"), /x^/.test("x"));

// Word boundaries.
console.log(all(/\b\w/g, "hi there_you-2b"), all(/\B\w/g, "ab cd"), "a b".replace(/\b/g, "|"));
console.log(/\bfoo\b/.test("a foo."), /\bfoo\b/.test("afoo"), all(/\B/g, "ab"), all(/\b/g, ""));

// Classes, negation, ranges and escapes.
console.log(all(/[a-c]+/g, "abcdcba"), all(/[^a-c]+/g, "abcdcba"), all(/[^"]*"/g, 'x"y""'));
console.log(all(/[\d.]+/g, "v1.25 and 3."), all(/[\w-]+/g, "a-b c_d"), all(/[-a]/g, "-ba-"));
console.log(all(/[a\-z]/g, "a-mz"), all(/[\]\\]/g, "a]b\\c"), all(/[.]/g, "a.b"), all(/[^]/g, "ab"));
console.log(all(/[\b]/g, "a\bb"), all(/\x41B\t/g, "AB\tAB"), all(/\0/g, "a\0b"), /[]/.test("a"));
console.log(all(/\s+/g, "a \t\n\v\f\rb"), all(/\S+/g, "a b"), all(/\D+/g, "a1b"), all(/\W/g, "a-b c"));
console.log(all(/\/\*.*?\*\//g, "a /* x */ b /**/ c"), all(/\$\{(\w+)\}/g, "${a}-${bc}"));

// The dot.
console.log(all(/a.b/g, "a\nb a\rb axb"), all(/a.b/gs, "a\nb a\rb axb"), all(/.+/g, "x\ny"));

// ASCII case folding.
console.log(all(/abc/gi, "ABC aBc abc"), all(/[a-c]+/gi, "xABcx"), all(/[^a]/gi, "aAb"));
console.log(all(/[^\W_]+/gi, "Ab_9 x"), all(/\w+/gi, "sK ſK"), all(/[k-l]/giu, "KkLl"));
console.log(/\W/i.test("s"), /\W/iu.test("s"), /\W/iu.test("k"), /[\W]/i.test("K"));
console.log(/s/i.test("ſ"), /s/iu.test("ſ"), /k/iu.test("K"), /[a-z]/i.test("K"));
console.log(all(/GET|post/gi, "get POST Get pOsT"), "Hello World".replace(/o/gi, "0"));

// Patterns outside the compiled subset still run (on the interpreter).
console.log(all(/(\w)\1/g, "aabbcd"), all(/a(?=b)/g, "abac"), all(/(?<=\$)\d+/g, "$5 $66"));
console.log(all(/\p{L}+/gu, "héllo wörld"), all(/[à-ÿ]+/g, "àé ok"));

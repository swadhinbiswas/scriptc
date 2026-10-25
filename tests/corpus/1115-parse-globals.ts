// The island-backed globals: parseFloat, parseInt (explicit radix), isNaN,
// isFinite — the engine's own globals execute and the result exits to the
// declared static type.
console.log(parseFloat("3.14abc"), parseFloat("  42  "), parseFloat("abc"), parseFloat(".5"));
console.log(parseFloat("1e3"), parseFloat("-2.5e-2"), parseFloat("Infinity"), parseFloat(""));
console.log(parseInt("ff", 16), parseInt("0x1A", 16), parseInt("101", 2), parseInt("42abc", 10));
console.log(parseInt("abc", 10), parseInt("777", 8), parseInt("z", 36), parseInt("-15", 10));
console.log(isNaN(0 / 0), isNaN(1), isNaN(parseFloat("nope")));
console.log(isFinite(1 / 0), isFinite(-1 / 0), isFinite(0), isFinite(0 / 0));
// Results are static numbers/booleans, chainable through static code.
const n = parseFloat("2.5") * parseInt("4", 10);
console.log(n, isFinite(n) && n > 9);

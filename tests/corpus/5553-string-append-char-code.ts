// `s += String.fromCharCode(c)` appends one character: ASCII, two- and
// three-byte characters, surrogate halves that join into one character,
// codes that wrap modulo 2^16, aliases of the old string (which must not
// change), and growth from an empty string, against Node.
let s = "";
const seen: string[] = [];
for (let i = 0; i < 1000; i++) {
  s += String.fromCharCode(32 + (i % 95));
  if (i % 250 === 0) seen.push(s);
}
console.log(s.length, s.slice(0, 10), s.slice(-10), seen.map((x) => x.length).join(","));
let t = "abc";
const alias = t;
t += String.fromCharCode(100);
t += String.fromCharCode(0xe9);
t += String.fromCharCode(0x65e5);
t += String.fromCharCode(0x10041);
t += String.fromCharCode(-1);
console.log(t, t.length, alias, alias.length);
let pair = "x";
pair += String.fromCharCode(0xd83d);
const half = pair;
pair += String.fromCharCode(0xde00);
console.log(pair, pair.length, half.length, half.charCodeAt(1).toString(16));
let lone = "";
lone += String.fromCharCode(0xde00);
lone += String.fromCharCode(0xd83d);
console.log(lone.length, lone.charCodeAt(0).toString(16), lone.charCodeAt(1).toString(16));
let codes = "";
for (const c of [72, 101, 108, 108, 111, 1.9, 65.5, 0x7f, 0x80]) codes += String.fromCharCode(c);
console.log(JSON.stringify(codes), codes.length);
function build(n: number): string {
  let out = "";
  for (let i = 0; i < n; i++) out += String.fromCharCode(97 + (i % 26));
  return out;
}
console.log(build(0), build(1), build(27), build(5000).length);

// localeCompare over ASCII strings of every length from 0 to 24 (across
// the eight-byte words the runtime compares at a time): a case, letter,
// digit or punctuation difference at each position, a tab, newline or
// carriage return at each position, and an accented letter at each
// position, against Node.
function sign(x: number): number {
  return x < 0 ? -1 : x > 0 ? 1 : 0;
}
const base = "abcdefghijklmnopqrstuvwxyz";
const swaps = ["A", "b", "0", "-", " ", "z", "\t", "\n", "\r", "é", "É"];
let out = "";
let equal = 0;
for (let n = 0; n <= 24; n++) {
  const s = base.slice(0, n);
  for (let i = 0; i <= n; i++) {
    for (const w of swaps) {
      const t = s.slice(0, i) + w + s.slice(i + 1);
      const u = s.slice(0, i) + w + s.slice(i);
      for (const [x, y] of [[s, t], [t, s], [s, u], [u, s], [t, u], [t.toUpperCase(), t]]) {
        const r = sign(x!.localeCompare(y!));
        out += r + 1;
        if (r === 0) equal++;
      }
    }
  }
}
let hash = 2166136261;
for (let i = 0; i < out.length; i++) hash = Math.imul(hash ^ out.charCodeAt(i), 16777619) >>> 0;
console.log(out.length, equal, hash.toString(16));
// Equal strings built separately, and prefixes of each other.
const words = ["", "a", "ab", "abcdefg", "abcdefgh", "abcdefghi", "abcdefghijklmnop", "abcdefghijklmnopq"];
for (const w of words) {
  const copy = (w + "x").slice(0, w.length);
  console.log(JSON.stringify(w), w.localeCompare(copy), w.localeCompare(w + "a"), (w + "a").localeCompare(w), w.toUpperCase().localeCompare(copy));
}

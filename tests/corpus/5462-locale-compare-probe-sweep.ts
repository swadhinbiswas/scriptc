// Every covered Latin character with its canonical and compatibility
// decompositions and case forms, compared pairwise in four contexts; a
// hash of all results and their counts match Node.
const ranges: [number, number][] = [[0x09, 0x0d], [0x20, 0x7e], [0xa0, 0x17f], [0x300, 0x36f], [0x2044, 0x2044]];
const covered = new Set<number>();
for (const [lo, hi] of ranges) for (let c = lo; c <= hi; c++) covered.add(c);
function inTable(s: string): boolean {
  for (const ch of s) if (!covered.has(ch.codePointAt(0)!)) return false;
  return true;
}
const probes = new Set<string>();
for (const c of covered) {
  const t = String.fromCharCode(c);
  for (const v of [t, t.normalize("NFD"), t.normalize("NFKD"), t.toUpperCase(), t.toLowerCase()]) if (inTable(v)) probes.add(v);
}
for (const pair of ["ae", "oe", "ij", "ss", "l\u00b7"]) {
  for (const u of [pair[0]!, pair[0]!.toUpperCase()]) for (const v of [pair.slice(1), pair.slice(1).toUpperCase()]) probes.add(u + v);
}
const list = [...probes];
const contexts = [(s: string) => s, (s: string) => s + "a", (s: string) => s + "B", (s: string) => "x" + s + "y"];
let hash = 2166136261;
const counts = [0, 0, 0];
for (const f of contexts) {
  for (const a of list) {
    const x = f(a);
    for (const b of list) {
      const r = x.localeCompare(f(b));
      const v = r < 0 ? 0 : r > 0 ? 2 : 1;
      counts[v] = counts[v]! + 1;
      hash = Math.imul(hash ^ v, 16777619) >>> 0;
    }
  }
}
console.log(list.length, counts.join(","), hash.toString(16));

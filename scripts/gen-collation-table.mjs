#!/usr/bin/env node
// Root-locale collation elements for String.prototype.localeCompare over the
// Latin repertoire (ASCII, Latin-1 Supplement, Latin Extended-A, the
// combining diacritical marks and U+2044 FRACTION SLASH, which the vulgar
// fractions expand through), derived from the pinned Node release's ICU
// (`localeCompare` with no locales/options) and verified against it.
//
//   node scripts/gen-collation-table.mjs          regenerate the table
//   node scripts/gen-collation-table.mjs --check  verify only
//
// Model: every covered code point maps to a short list of collation
// elements (primary, secondary, tertiary). Precomposed letters are their
// base letter's element followed by one secondary-only element for the
// diacritic; letters with a stroke or other built-in variant (ø, ł, đ, ...)
// carry the same extra secondary; ligatures expand (æ → a, e), and so do
// the vulgar fractions (¼ → 1, ⁄, 4); the combining Latin letters
// (U+0363–U+036F) are their letter's primary with a combining class. Strings
// compare level by level over the concatenated elements — primaries
// (zero primaries skipped), then secondaries, then tertiaries — which is the
// multi-level comparison ICU applies at its default (tertiary) strength.
// The output is written only after a randomized differential check against
// Node's own localeCompare passes.
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "packages/runtime/src/scr_collation_data.h");
const checkOnly = process.argv.includes("--check");

const base = new Intl.Collator(undefined, { sensitivity: "base" });
const accent = new Intl.Collator(undefined, { sensitivity: "accent" });
const variant = new Intl.Collator(undefined, { sensitivity: "variant" });

export const RANGES = [
  [0x09, 0x0d],
  [0x20, 0x7e],
  [0xa0, 0x17f],
  [0x300, 0x36f],
  [0x2044, 0x2044],
];
const ch = (c) => String.fromCodePoint(c);
const isMark = (c) => c >= 0x300 && c <= 0x36f;
// Combining marks that carry a primary weight: the combining Latin letters.
const isLetterMark = (c) => isMark(c) && base.compare("a" + ch(c), "a") !== 0;
const covered = [];
for (const [lo, hi] of RANGES) for (let c = lo; c <= hi; c++) covered.push(c);
const coveredSet = new Set(covered);

// 1. Combining marks: secondary weights of the diacritics by their order on
//    a base letter.
const allMarks = covered.filter(isMark);
const marks = allMarks.filter((c) => !isLetterMark(c));
const markOrder = [...marks].sort((a, b) => accent.compare("a" + ch(a), "a" + ch(b)) || a - b);
const markWeight = new Map();
{
  let w = 1;
  for (let i = 0; i < markOrder.length; i++) {
    if (i > 0 && accent.compare("a" + ch(markOrder[i - 1]), "a" + ch(markOrder[i])) !== 0) w++;
    markWeight.set(markOrder[i], w);
  }
}

// Canonical combining classes, as ranks: ICU normalizes (NFD, with marks
// reordered by class) before collating. Derived from the canonical
// reordering Node's normalize() applies to mark pairs.
const reorders = (a, b) => ("x" + ch(a) + ch(b)).normalize("NFD") !== "x" + ch(a) + ch(b);
const atomicMarks = allMarks.filter((m) => ch(m).normalize("NFD") === ch(m));
const movable = atomicMarks.filter((m) =>
  atomicMarks.some((n) => reorders(m, n) || reorders(n, m)),
);
const cccOrder = [...movable].sort(
  (a, b) => (reorders(a, b) ? 1 : reorders(b, a) ? -1 : 0) || a - b,
);
const cccRank = new Map();
{
  let r = 1;
  for (let i = 0; i < cccOrder.length; i++) {
    const prev = cccOrder[i - 1];
    if (i > 0 && (reorders(prev, cccOrder[i]) || reorders(cccOrder[i], prev))) r++;
    cccRank.set(cccOrder[i], r);
  }
}

// 2. Ignorable code points (no weight at any level).
const ignorable = new Set(
  covered.filter(
    (c) => variant.compare(ch(c) + "a", "a") === 0 && variant.compare("a" + ch(c), "a") === 0,
  ),
);

// 3. Expansions: a code point equal at the base level to two ASCII letters.
const letters = "abcdefghijklmnopqrstuvwxyz";
const expansion = new Map();
for (const c of covered) {
  if (c < 0x80 || isMark(c) || ignorable.has(c) || ch(c).normalize("NFD") !== ch(c)) continue;
  if (covered.some((d) => d < 0x80 && base.compare(ch(c), ch(d)) === 0)) continue;
  for (const x of letters)
    for (const y of letters)
      if (base.compare(ch(c), x + y) === 0 && !expansion.has(c)) expansion.set(c, x + y);
}

// Compatibility expansions of three or more code points (the vulgar
// fractions): equal at the base level to their compatibility decomposition.
const compatExpansion = new Map();
for (const c of covered) {
  const k = ch(c).normalize("NFKD");
  if (isMark(c) || ch(c).normalize("NFD") !== ch(c) || [...k].length < 3) continue;
  if ([...k].every((x) => coveredSet.has(x.codePointAt(0))) && base.compare(ch(c), k) === 0)
    compatExpansion.set(c, k);
}

// 4. Primary classes over single code points (base level), in order.
const singles = covered.filter(
  (c) => !isMark(c) && !ignorable.has(c) && !expansion.has(c) && !compatExpansion.has(c),
);
const decomposedBase = (c) => {
  const nfd = ch(c).normalize("NFD");
  return nfd.length > 1 && isMark(nfd.codePointAt(1)) ? nfd.codePointAt(0) : null;
};
const primaryReps = singles.filter((c) => decomposedBase(c) === null);
primaryReps.sort((a, b) => base.compare(ch(a), ch(b)) || a - b);
const primaryOf = new Map();
{
  let p = 1;
  for (let i = 0; i < primaryReps.length; i++) {
    if (i > 0 && base.compare(ch(primaryReps[i - 1]), ch(primaryReps[i])) !== 0) p++;
    primaryOf.set(primaryReps[i], p);
  }
}
// The class representative: the ASCII member when there is one.
const repOf = (c) => {
  const p = primaryOf.get(c);
  const ascii = primaryReps.find((d) => primaryOf.get(d) === p && d < 0x80);
  return ascii ?? primaryReps.find((d) => primaryOf.get(d) === p);
};

// 5. Extra secondary of a non-decomposable variant letter (ø against o):
//    the mark whose sequence it equals at the accent level, or a weight
//    placed among the marks by comparison.
const extraSecondary = new Map();
const variantMark = new Map();
let nextUnique = markOrder.length + 10;
const syntheticAt = [];
for (const c of primaryReps) {
  const r = repOf(c);
  if (r === c || accent.compare(ch(c), ch(r)) === 0) continue;
  const same = markOrder.find((m) => accent.compare(ch(c), ch(r) + ch(m)) === 0);
  if (same !== undefined) {
    variantMark.set(c, same);
    continue;
  }
  // Insert between mark weights: below the first mark it sorts before.
  let below = markOrder.findIndex((m) => accent.compare(ch(c), ch(r) + ch(m)) < 0);
  if (below < 0) below = markOrder.length;
  syntheticAt.push({ c, below });
}
// Ligatures differ from their spelled-out pair by a secondary between the
// halves (æ against a, e): a mark's weight or a synthetic one.
const expansionSecondary = new Map();
const expansionMark = new Map();
for (const [c, pair] of expansion) {
  if (accent.compare(ch(c), pair) === 0) continue;
  const same = markOrder.find((m) => accent.compare(ch(c), pair[0] + ch(m) + pair[1]) === 0);
  if (same !== undefined) {
    expansionMark.set(c, same);
    continue;
  }
  let below = markOrder.findIndex((m) => accent.compare(ch(c), pair[0] + ch(m) + pair[1]) < 0);
  if (below < 0) below = markOrder.length;
  syntheticAt.push({ c, below, expansion: true });
}
// Synthetic weights are fractional slots; renumber all secondaries densely.
{
  const entries = [];
  for (const [m, w] of markWeight) entries.push({ key: `m${m}`, w: w * 2 });
  // Case pairs (Æ/æ, Ð/ð) share their synthetic secondary: they differ at
  // the tertiary level only.
  const uniqueByFold = new Map();
  for (const { c, below, expansion: isExpansion } of syntheticAt) {
    const fold = ch(c).toLowerCase();
    if (below >= markOrder.length && !uniqueByFold.has(fold)) uniqueByFold.set(fold, nextUnique++);
    const w =
      below < markOrder.length
        ? markWeight.get(markOrder[below]) * 2 - 1
        : uniqueByFold.get(fold) * 2;
    entries.push({ key: `${isExpansion ? "x" : "c"}${c}`, w });
  }
  const distinct = [...new Set(entries.map((e) => e.w))].sort((a, b) => a - b);
  const dense = new Map(distinct.map((w, i) => [w, i + 2])); // 1 is "common"
  for (const e of entries) {
    const w = dense.get(e.w);
    if (e.key.startsWith("m")) markWeight.set(Number(e.key.slice(1)), w);
    else if (e.key.startsWith("x")) expansionSecondary.set(Number(e.key.slice(1)), w);
    else extraSecondary.set(Number(e.key.slice(1)), w);
  }
}

for (const [c, m] of variantMark) extraSecondary.set(c, markWeight.get(m));
for (const [c, m] of expansionMark) expansionSecondary.set(c, markWeight.get(m));

// 6. Elements of marks, ignorables and base characters; decomposable
//    characters and ligatures are built from them in step 7.
const COMMON = 1;
const elements = new Map();
for (const c of covered) {
  if (ignorable.has(c)) elements.set(c, []);
  else if (isMark(c) && ch(c).normalize("NFD") === ch(c) && markWeight.has(c))
    elements.set(c, [[0, markWeight.get(c), COMMON, cccRank.get(c) ?? 0]]);
}
for (const c of primaryReps) {
  const ces = [[primaryOf.get(c), COMMON, 0, 0]];
  if (extraSecondary.has(c)) ces.push([0, extraSecondary.get(c), COMMON, 0]);
  elements.set(c, ces);
}
// 7. Tertiary. Base characters (primaryReps) are ranked within each group
//    whose primary+secondary elements agree, at even weights. Canonically
//    decomposable characters then take their atoms' elements, so they equal
//    their decompositions at every level, as canonical equivalence requires.
//    A ligature whose spelled-out pair ties with it at the secondary level
//    (ĳ against ij) gets the weight Node places it at among the case forms
//    of its first letter; odd weights fall between two of them.
const psKey = (c) =>
  elements
    .get(c)
    .map((e) => `${e[0]}.${e[1]}`)
    .join(" ");
const groups = new Map();
for (const c of primaryReps) {
  const k = psKey(c);
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(c);
}
const tertiaryOf = new Map();
for (const members of groups.values()) {
  members.sort((a, b) => variant.compare(ch(a), ch(b)) || a - b);
  let t = 1;
  for (let i = 0; i < members.length; i++) {
    if (i > 0 && variant.compare(ch(members[i - 1]), ch(members[i])) !== 0) t++;
    tertiaryOf.set(members[i], 2 * t);
  }
}
for (const c of primaryReps)
  for (const e of elements.get(c)) if (e[0] !== 0) e[2] = tertiaryOf.get(c);
const atomsOf = (c) =>
  [...ch(c).normalize("NFD")].flatMap((x) => elements.get(x.codePointAt(0)).map((e) => [...e]));
for (const c of covered) {
  if (ignorable.has(c) || primaryReps.includes(c) || expansion.has(c)) continue;
  if (compatExpansion.has(c) || (isMark(c) && ch(c).normalize("NFD") === ch(c))) continue;
  elements.set(c, atomsOf(c));
}
const groupOf = (c) => {
  const members = groups.get(psKey(c)) ?? [c];
  return [...members].sort((a, b) => tertiaryOf.get(a) - tertiaryOf.get(b));
};
// The tertiary weight Node places `c` at among the case forms `group`
// (sorted by weight) when it ties with them at the secondary level: a
// member's weight, or an odd weight between two of them.
const insertTertiary = (c, group, spell) => {
  const below = group.filter((m) => variant.compare(c, spell(m)) > 0);
  const equal = group.find((m) => variant.compare(c, spell(m)) === 0);
  if (equal !== undefined) return tertiaryOf.get(equal);
  return below.length > 0
    ? tertiaryOf.get(below[below.length - 1]) + 1
    : tertiaryOf.get(group[0]) - 1;
};
// A combining Latin letter is its letter's primary at the letter's
// secondary, with a tertiary among the letter's case forms and the
// combining class of the diacritics it reorders with.
for (const c of allMarks.filter(isLetterMark)) {
  const letter = primaryReps.find((r) => r < 0x80 && base.compare(ch(c), ch(r)) === 0);
  if (letter === undefined || accent.compare(ch(c), ch(letter)) !== 0)
    throw new Error(`U+${c.toString(16)} is not a letter at the accent level`);
  const t = insertTertiary(ch(c), groupOf(letter), ch);
  elements.set(c, [[primaryOf.get(letter), COMMON, t, cccRank.get(c) ?? 0]]);
}
// A vulgar fraction is the elements of its compatibility decomposition;
// each element's tertiary weight is where Node places the fraction among
// that position's case and compatibility forms (¼ after ¹⁄4).
for (const [c, k] of compatExpansion) {
  const atoms = [...k];
  const es = atoms.flatMap((x, i) => {
    const own = atomsOf(x.codePointAt(0));
    const group = groupOf(x.codePointAt(0));
    const spell = (m) => atoms.slice(0, i).join("") + ch(m) + atoms.slice(i + 1).join("");
    const t = insertTertiary(ch(c), group, spell);
    for (const e of own) if (e[0] !== 0) e[2] = t;
    return own;
  });
  elements.set(c, es);
}
for (const [c, pair] of expansion) {
  const [x, y] = [...pair].map((q) => q.codePointAt(0));
  const middle = expansionSecondary.has(c) ? [[0, expansionSecondary.get(c), COMMON, 0]] : [];
  const es = [...atomsOf(x), ...middle, ...atomsOf(y)];
  // A ligature with its own secondary (æ) keeps the case of its first
  // letter in the ligature's case (Æ: the weight of A).
  const upper = ch(c) !== ch(c).toLowerCase();
  let t = tertiaryOf.get(upper ? ch(x).toUpperCase().codePointAt(0) : x);
  if (middle.length === 0) {
    const gx = groupOf(x);
    const gy = groupOf(y);
    const low = ch(gy[0]),
      high = ch(gy[gy.length - 1]);
    const below = gx.filter((m) => variant.compare(ch(c), ch(m) + high) > 0);
    const equal = gx.find(
      (m) => variant.compare(ch(c), ch(m) + low) >= 0 && variant.compare(ch(c), ch(m) + high) <= 0,
    );
    t =
      equal !== undefined
        ? tertiaryOf.get(equal)
        : below.length > 0
          ? tertiaryOf.get(below[below.length - 1]) + 1
          : tertiaryOf.get(gx[0]) - 1;
  }
  for (const e of es) if (e[0] !== 0) e[2] = t;
  elements.set(c, es);
}
// Contractions: a covered character that Node treats as equal to its
// two-character compatibility form (ŀ and l·) gives that pair its elements,
// where the pair's own characters would order differently ("L·a" > "La").
const contractions = new Map();
for (const c of covered) {
  const k = ch(c).normalize("NFKD");
  const cps = [...k].map((q) => q.codePointAt(0));
  if (cps.length !== 2 || !cps.every((q) => coveredSet.has(q))) continue;
  if (ch(c).normalize("NFD") === k || variant.compare(ch(c), k) !== 0) continue;
  const own = JSON.stringify(elements.get(c));
  const spelled = JSON.stringify(cps.flatMap((q) => elements.get(q)));
  if (own !== spelled)
    contractions.set(
      k,
      elements.get(c).map((e) => [...e]),
    );
}

// The model's comparison (mirrored by scr_str_locale_compare in C).
export function modelCompare(a, b) {
  const ces = (s) => {
    const cps = [...s].map((x) => x.codePointAt(0));
    const es = [];
    for (let i = 0; i < cps.length; i++) {
      const pair = i + 1 < cps.length ? String.fromCodePoint(cps[i], cps[i + 1]) : "";
      if (contractions.has(pair)) {
        es.push(...contractions.get(pair));
        i++;
      } else {
        es.push(...elements.get(cps[i]));
      }
    }
    // Canonical reordering: stable sort each run of movable marks by class.
    for (let i = 1; i < es.length; i++) {
      const e = es[i];
      if (e[3] === 0) continue;
      let j = i;
      while (j > 0 && es[j - 1][3] > e[3]) {
        es[j] = es[j - 1];
        j--;
      }
      es[j] = e;
    }
    return es;
  };
  const ea = ces(a);
  const eb = ces(b);
  for (const level of [0, 1, 2]) {
    // Zero primaries (diacritics) are skipped at the primary level only.
    const wa = ea.filter((e) => level !== 0 || e[0] !== 0).map((e) => e[level]);
    const wb = eb.filter((e) => level !== 0 || e[0] !== 0).map((e) => e[level]);
    const n = Math.min(wa.length, wb.length);
    for (let i = 0; i < n; i++) if (wa[i] !== wb[i]) return wa[i] < wb[i] ? -1 : 1;
    if (wa.length !== wb.length) return wa.length < wb.length ? -1 : 1;
  }
  return 0;
}

// 8. Differential verification against Node.
let seed = 0x5eed;
const rnd = (n) => {
  seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
  return seed % n;
};
const pool = covered.filter((c) => !isMark(c));
const heavy = [..."aAbBeEoOsSzZ ,.-_'1 2éÉèäÄöøØßæÆœłŁđ"].map((x) => x.codePointAt(0));
const word = () => {
  const n = 1 + rnd(5);
  let s = "";
  for (let i = 0; i < n; i++) {
    const r = rnd(10);
    s += ch(
      r < 6
        ? heavy[rnd(heavy.length)]
        : r < 9
          ? pool[rnd(pool.length)]
          : allMarks[rnd(allMarks.length)],
    );
  }
  return s;
};
let mismatches = 0;
const samples = [];
const check = (a, b) => {
  const want = a.localeCompare(b);
  const got = modelCompare(a, b);
  if (Math.sign(want) !== got) {
    mismatches++;
    if (samples.length < 20)
      samples.push(`${JSON.stringify(a)} vs ${JSON.stringify(b)}: node ${want}, model ${got}`);
  }
};
for (const x of pool) for (const y of pool) check(ch(x), ch(y));
for (let i = 0; i < 300000; i++) check(word(), word());
// Equivalent and near-equivalent spellings, which random strings rarely
// produce: each covered character with its canonical and compatibility
// decompositions and case forms, ligatures with their spelled-out pairs, in
// four contexts. These pairs tie at the primary and secondary levels, so
// they check the tertiary weights, contractions and canonical equivalence.
const inTable = (t) => [...t].every((x) => coveredSet.has(x.codePointAt(0)));
const probes = new Set();
for (const c of covered) {
  const t = ch(c);
  for (const v of [t, t.normalize("NFD"), t.normalize("NFKD"), t.toUpperCase(), t.toLowerCase()])
    if (inTable(v)) probes.add(v);
}
for (const [, pair] of expansion) {
  const [x, y] = [...pair];
  for (const u of [x, x.toUpperCase()]) for (const v of [y, y.toUpperCase()]) probes.add(u + v);
}
// Fractions against their spellings with an ASCII slash and a superscript
// numerator.
const superscript = { 1: "\u00b9", 2: "\u00b2", 3: "\u00b3" };
for (const [, k] of compatExpansion) {
  probes.add(k.replace("\u2044", "/"));
  probes.add(superscript[k[0]] + k.slice(1));
}
const contexts = [(t) => t, (t) => t + "a", (t) => t + "B", (t) => "x" + t + "y"];
let probeCount = 0;
for (const f of contexts)
  for (const a of probes)
    for (const b of probes) {
      check(f(a), f(b));
      probeCount++;
    }
// Combining Latin letters against their letters, with each diacritic before
// and after them: canonical reordering moves them past marks of a lower
// class only.
let markCount = 0;
for (const m of allMarks.filter(isLetterMark)) {
  const letter = ch(m).normalize("NFKD") === ch(m) ? null : ch(m).normalize("NFKD");
  const l = letter ?? [...letters].find((x) => base.compare(ch(m), x) === 0);
  for (const d of marks) {
    const set = [
      "a" + ch(m) + ch(d),
      "a" + ch(d) + ch(m),
      "a" + ch(d) + l,
      "a" + l + ch(d),
      "a" + ch(m),
      "a" + l,
      "a" + l.toUpperCase() + ch(d),
    ];
    for (const x of set)
      for (const y of set) {
        check(x, y);
        markCount++;
      }
  }
}
if (mismatches > 0) {
  console.error(`collation model disagrees with Node in ${mismatches} cases:`);
  for (const s of samples) console.error(`  ${s}`);
  process.exit(1);
}
console.log(
  `collation model matches Node over ${pool.length ** 2 + 300000 + probeCount + markCount} comparisons`,
);
if (checkOnly) process.exit(0);

// 9. Emit the C table.
const lines = [];
lines.push("/* Generated by scripts/gen-collation-table.mjs from the pinned Node");
lines.push(" * release's root-locale collation (ICU, localeCompare without locales or");
lines.push(" * options). Do not edit by hand. Each covered code point maps to up to");
lines.push(" * three collation elements {primary, secondary, tertiary, combining class");
lines.push(" * rank}; zero primaries are skipped at the primary level, and runs of");
lines.push(" * marks with a nonzero class rank are put in canonical order before");
lines.push(" * comparing. n == 255 marks an uncovered code point. A pair listed in");
lines.push(" * scr_coll_contractions collates as its one entry. */");
lines.push("#ifndef SCR_COLLATION_DATA_H");
lines.push("#define SCR_COLLATION_DATA_H");
lines.push("#include <stdint.h>");
lines.push("typedef struct { uint16_t p; uint8_t s; uint8_t t; uint8_t ccc; } ScrCollElem;");
lines.push("typedef struct { uint8_t n; ScrCollElem e[3]; } ScrCollEntry;");
lines.push("#define SCR_COLL_UNCOVERED {255, {{0, 0, 0, 0}}}");
const maxP = Math.max(...[...elements.values()].flat().map((e) => e[0]));
const maxS = Math.max(...[...elements.values()].flat().map((e) => e[1]));
const maxT = Math.max(...[...elements.values()].flat().map((e) => e[2]));
if (maxP > 0xffff || maxS > 0xff || maxT > 0xff)
  throw new Error("weights overflow the table types");
// Code points below DENSE_LIMIT share one table indexed by code point, with
// the gaps between ranges marked uncovered, so a lookup there is one
// comparison; the ranges above it get a table each.
const hex = (q) => "U+" + q.toString(16).toUpperCase().padStart(4, "0");
const DENSE_LIMIT = 0x370;
if (RANGES.some(([lo, hi]) => lo < DENSE_LIMIT && hi >= DENSE_LIMIT))
  throw new Error("a range straddles the dense table's limit");
const tables = [[0, DENSE_LIMIT - 1], ...RANGES.filter(([lo]) => lo >= DENSE_LIMIT)];
for (const [lo, hi] of tables) {
  const name = `scr_coll_${lo.toString(16).padStart(4, "0")}`;
  lines.push(`static const ScrCollEntry ${name}[${hi - lo + 1}] = {`);
  for (let c = lo; c <= hi; c++) {
    if (!coveredSet.has(c)) {
      // A run of uncovered code points: a comment, then five per line.
      let end = c;
      while (end < hi && !coveredSet.has(end + 1)) end++;
      lines.push(`    /* ${hex(c)}..${hex(end)} not covered */`);
      for (let q = c; q <= end; q += 5)
        lines.push("   " + " SCR_COLL_UNCOVERED,".repeat(Math.min(5, end - q + 1)));
      c = end;
      continue;
    }
    const es = elements.get(c);
    if (es.length > 3) throw new Error(`U+${c.toString(16)} needs ${es.length} elements`);
    const body = es.map((e) => `{${e[0]}, ${e[1]}, ${e[2]}, ${e[3]}}`).join(", ");
    lines.push(
      `    {${es.length}, {${body}}}, /* U+${c.toString(16).toUpperCase().padStart(4, "0")} */`,
    );
  }
  lines.push("};");
}
lines.push("static const ScrCollEntry *scr_coll_lookup(uint32_t c) {");
lines.push(`  if (c < 0x${DENSE_LIMIT.toString(16)}) return &scr_coll_0000[c];`);
for (const [lo, hi] of tables.slice(1)) {
  const name = `scr_coll_${lo.toString(16).padStart(4, "0")}`;
  lines.push(
    `  if (c >= 0x${lo.toString(16)} && c <= 0x${hi.toString(16)}) return &${name}[c - 0x${lo.toString(16)}];`,
  );
}
lines.push("  return 0;");
lines.push("}");
lines.push("/* Two-code-point contractions: the pair collates as one entry (l· as ŀ). */");
lines.push("typedef struct { uint32_t first, second; ScrCollEntry entry; } ScrCollContraction;");
lines.push(`#define SCR_COLL_CONTRACTIONS ${contractions.size}`);
lines.push(
  `static const ScrCollContraction scr_coll_contractions[${Math.max(contractions.size, 1)}] = {`,
);
for (const [pair, es] of contractions) {
  const [x, y] = [...pair].map((q) => q.codePointAt(0));
  if (es.length > 3) throw new Error(`contraction ${pair} needs ${es.length} elements`);
  const body = es.map((e) => `{${e[0]}, ${e[1]}, ${e[2]}, ${e[3]}}`).join(", ");
  lines.push(
    `    {0x${x.toString(16)}, 0x${y.toString(16)}, {${es.length}, {${body}}}}, /* ${hex(x)} ${hex(y)} */`,
  );
}
if (contractions.size === 0) lines.push("    {0, 0, {0, {{0, 0, 0, 0}}}},");
lines.push("};");
lines.push("#endif");
await writeFile(out, lines.join("\n") + "\n");
console.log(`wrote ${out}`);

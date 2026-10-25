// Regex literals evaluated directly as the regex of test/exec/match/
// matchAll/search/replace/replaceAll/split: each evaluation starts from a
// fresh lastIndex, so global and sticky sites behave the same on every
// pass, including when another operand evaluates the same site first.
export {};

const subjects = ["a1b22c333", "", "xyz", "aaa", "é1😀22漢333"];

for (let pass = 0; pass < 3; pass++) {
  const row: string[] = [];
  for (const s of subjects) {
    row.push(String(/\d+/g.test(s)));
    row.push(String(/\d/y.test(s)));
    row.push(String(/a/g.exec(s)?.[0]));
    row.push(String(/\d+/y.exec(s)?.[0]));
    row.push(JSON.stringify(s.match(/\d+/g)));
    row.push(JSON.stringify(s.match(/[a-z]/y)));
    row.push(String(s.search(/\d/g)));
    row.push(String(s.search(/\d/y)));
    row.push(s.replace(/\d/g, "#"));
    row.push(s.replace(/\d/y, "#"));
    row.push(s.replace(/a/, "<$&>"));
    row.push(s.replaceAll(/\d+/g, "[$&]"));
    row.push(JSON.stringify(s.split(/\d+/)));
    row.push(JSON.stringify(s.split(/(\d)/, 3)));
    row.push(JSON.stringify([...s.matchAll(/(\d)(\d)?/g)]));
  }
  console.log(pass, row.join(" | "));
}

// A loop over one global literal site: every evaluation is a new object.
let found = 0;
for (let i = 0; i < 5; i++) if (/b/g.test("abc")) found++;
console.log("found", found);

// Another operand evaluates the same site before the call itself runs.
let depth = 0;
function probe(s: string): string {
  if (depth < 3) {
    depth++;
    console.log("inner", depth, check(s));
  }
  return s;
}
function check(s: string): boolean {
  return /x/g.test(probe(s));
}
console.log("outer", check("xx"));

depth = 0;
function sticky(s: string): string | undefined {
  return /x/y.exec(stickyProbe(s))?.[0];
}
function stickyProbe(s: string): string {
  if (depth < 2) {
    depth++;
    console.log("sticky inner", sticky(s));
  }
  return s;
}
console.log("sticky outer", sticky("xx"));

// Stored literals keep their own identity and lastIndex.
const made: RegExp[] = [];
for (let i = 0; i < 3; i++) made.push(/q/g);
console.log(made[0] === made[1], made[1] === made[2]);
made[0]!.test("qq");
console.log(made[0]!.lastIndex, made[1]!.lastIndex);
const kept = /q/g;
kept.test("qq");
console.log(kept.lastIndex, kept.test("qq"), kept.lastIndex, kept.test("qq"), kept.lastIndex);
console.log(/q/g.lastIndex, /q/g.source, /q/g.flags, String(/q/gi));

// Callback replacements on literal sites.
console.log("a1a2".replace(/a(\d)/g, (m: string, d: string) => `<${m}:${d}>`));
console.log("a1a2".replace(/a/y, () => "Y"));

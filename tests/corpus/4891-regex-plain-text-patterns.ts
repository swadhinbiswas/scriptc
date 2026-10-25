// Patterns that match only their own text: substitutions, flags, escapes,
// non-ASCII subjects, split limits and constructed regexes.
export {};

const subjects = ["", "a.b.a", "x$y$$z", "a/b//c", "aaaa", "é.漢.😀.", "...", "a\0.b", "Tab\tq"];
const templates = ["", "-", "$", "$$", "$&", "$`", "$'", "$1", "$0", "$<n>", "<$&|$`|$'>", "é😀$$"];

for (const s of subjects) {
  const parts: string[] = [];
  for (const t of templates) {
    parts.push(s.replace(/\./, t), s.replace(/\./g, t), s.replaceAll(/\./g, t));
  }
  console.log(JSON.stringify(s), JSON.stringify(parts));
  console.log(
    s.replace(/\$/g, "D"),
    s.replace(/\//g, "|"),
    s.replace(/a/g, "A"),
    s.replace(/aa/g, "b"),
    s.replace(/\//, "!"),
    s.replace(/\t/g, "T"),
  );
  console.log(
    /\./.test(s),
    /\$\$/.test(s),
    /a\.b/.test(s),
    s.search(/\./),
    s.search(/a/),
    s.search(/😀/u),
    s.search(/漢/),
  );
  for (const limit of [undefined, 0, 1, 2, -1, 4294967297, 1.5, NaN]) {
    console.log(limit, JSON.stringify(s.split(/\./, limit)), JSON.stringify(s.split(/\.\./, limit)));
  }
}

// Flags that do not change a plain pattern, and ones that do.
const text = "1-2\n-3-A-a";
console.log(text.replace(/-/gi, "+"), text.replace(/-/gm, "+"), text.replace(/-/gs, "+"), text.replace(/-/gu, "+"));
console.log(text.replace(/a/gi, "+"), text.replace(/A/g, "+"), text.replace(/-/y, "+"), text.replace(/1/y, "+"));
console.log(text.split(/-/i), text.split(/-/y), text.search(/-/i), /\n/m.test(text), /3/i.test(text));

// Constructed regexes over the same patterns.
const dots = new RegExp("\\.", "g");
console.log("a.b.c".replace(dots, "!"), dots.lastIndex, dots.test("a.b"), dots.lastIndex);
console.log("a.b.c".split(new RegExp("\\.")), "a.b.c".search(new RegExp("b")), new RegExp("x", "g").test("yx"));

// Global test and exec keep lastIndex semantics on stored plain patterns.
const comma = /,/g;
const csv = "a,b,,c";
const ends: number[] = [];
while (comma.test(csv)) ends.push(comma.lastIndex);
console.log(ends.join(" "), comma.lastIndex);
let m: RegExpExecArray | null;
const plain = /,/g;
while ((m = plain.exec("é,😀,x")) !== null) console.log(m[0], m.index, plain.lastIndex);
const once = /b/;
once.lastIndex = 5;
console.log(once.test("abc"), once.lastIndex, "abc".replace(once, "B"), once.lastIndex);

// Long subjects and many matches.
const long = "<&>\"".repeat(2000) + "é".repeat(100) + "&";
const escaped = long.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
console.log(escaped.length, escaped.slice(0, 40), escaped.slice(-20));
console.log(long.split(/&/).length, long.split(/&/, 7).length);

// Generates path.win32 test cases with Node as the oracle.
// Each line: <op>\t<arg-hex>...\t<expected-hex>
//
//   node gen-path-cases.mjs > path-cases.txt
//
// All strings are hex-encoded UTF-8 bytes ("-" = empty) so the file is
// unambiguous. Boolean results (isAbsolute) encode the hex of "true" /
// "false". Node v24 is required (the win32 port targets v24's lib/path.js
// — the reserved-device-name and CVE-2024-36139 behaviors changed across
// majors), and the process chdir's to "/" first so the cwd-consulting
// functions (resolve, relative, toNamespacedPath) are deterministic:
// test_path.c chdir's to the same place. Note Node's own win32.resolve is
// HOST-conditional in one spot (the current-directory fast path flips
// slashes on POSIX hosts only); the C port compiles that branch by
// target (#ifdef _WIN32), and this generator runs on the POSIX host where
// the two agree.
//
// Known ASCII-fold divergence (documented in scr_path.c): Node's
// case-insensitive comparisons use String.prototype.toLowerCase/
// toUpperCase; the C port folds ASCII only. The generated corpus keeps
// non-ASCII strings OUT of the one position where that fold decides the
// result (relative() across pairs differing only in non-ASCII case) and
// everywhere else exercises Unicode freely.
import { win32 } from "node:path";
import { stdout } from "node:process";

process.chdir("/");

const hex = (str) => {
  const b = Buffer.from(str, "utf8");
  return b.length ? b.toString("hex") : "-";
};

const lines = [];
const emit = (op, args, result) => {
  lines.push([op, ...args.map(hex), hex(result)].join("\t"));
};

// ── the path vocabulary ──────────────────────────────────────────────
const paths = [
  "",
  ".",
  "..",
  "...",
  "./",
  "../",
  ".\\",
  "..\\",
  "/",
  "\\",
  "//",
  "\\\\",
  "///",
  "\\\\\\",
  "/a",
  "\\a",
  "a",
  "a/",
  "a\\",
  "a/b",
  "a\\b",
  "a/b/c",
  "a\\b\\c",
  "a/b/c/",
  "a\\b\\c\\",
  "a//b",
  "a\\\\b",
  "a/./b",
  "a\\.\\b",
  "a/../b",
  "a\\..\\b",
  "a/b/..",
  "a\\b\\..",
  "../a/b",
  "..\\a\\b",
  "a/b/../../..",
  "a\\b\\..\\..\\..",
  "/../../a",
  "\\..\\..\\a",
  "/a/b/c",
  "\\a\\b\\c",
  "/a/b/c/",
  "\\a\\b\\c\\",
  "//a/b/c",
  "\\\\a\\b\\c",
  "fixtures///b/../b/c.js",
  "fixtures\\\\\\b\\..\\b\\c.js",
  "/foo/../../../bar",
  "\\foo\\..\\..\\..\\bar",
  "foo/bar\\baz",
  // drive letters
  "C:",
  "c:",
  "C:/",
  "C:\\",
  "C:a",
  "C:a/b",
  "C:./a",
  "C:../a",
  "C:/a",
  "C:\\a",
  "C:/a/b",
  "C:\\a\\b",
  "C:/a/../b",
  "C:\\a\\..\\b",
  "C:/a/b/",
  "C:\\a\\b\\",
  "C:..\\a",
  "C:\\.",
  "C:\\..",
  "c:/blah\\blah",
  "d:/games",
  "d:../a/b",
  "D:\\..\\..\\x",
  "Z:whatever",
  "1:/a",
  "ab:/c",
  ":\\a",
  // UNC
  "//server",
  "\\\\server",
  "//server/share",
  "\\\\server\\share",
  "//server/share/",
  "\\\\server\\share\\",
  "//server/share/dir/file.txt",
  "\\\\server\\share\\dir\\file.txt",
  "\\\\server\\share\\..\\x",
  "//server//share",
  "\\\\server\\\\share",
  "///server/share/x",
  "\\\\\\server\\share\\x",
  "//server/share/../..",
  // device + verbatim paths
  "\\\\.\\PHYSICALDRIVE0",
  "\\\\.\\c:\\x",
  "//./c:/x/../y",
  "\\\\?\\C:\\x\\..\\y",
  "//?/UNC/server/share/x",
  "\\\\?\\UNC\\server\\share\\a\\..\\b",
  "\\\\.\\",
  "\\\\?\\",
  "\\\\.",
  "\\\\?",
  // reserved device names (the v24 hardening)
  "CON",
  "con",
  "CON:",
  "con:x",
  "NUL",
  "NUL:",
  "nul.txt",
  "COM1",
  "COM1:",
  "com9:tail",
  "LPT1:",
  "lpt1:/x",
  "AUX:",
  "PRN:",
  "COM¹:",
  "lpt³:",
  "CONX",
  "XCON",
  "a/CON",
  "a\\NUL:",
  "C:\\CON",
  "CON:extra:colons",
  "a:b:c",
  "x:",
  "x:y:",
  // colon shenanigans (the CVE-2024-36139 block)
  "a:./b",
  "a:.\\b",
  "abc:",
  "abc:/x",
  "a/b:",
  "a\\b:c",
  "a:\\b",
  "con¹",
  "..:",
  // dots and extensions
  "file.txt",
  "file.",
  ".file",
  ".file.txt",
  "file..",
  "a.b/c",
  "C:\\a\\b.txt",
  "C:\\a.b\\c",
  "\\\\server\\share\\f.ext",
  "a\\b.c\\d",
  "C:.txt",
  "C:\\..txt",
  "x\\..",
  "..\\.",
  // whitespace / odd bytes
  " ",
  " /a",
  " \\a",
  "a b\\c d",
  "\ta\n",
  // unicode
  "é",
  "C:\\café\\naïve",
  "你好/世界",
  "\\\\sérver\\share",
  "C:\\\u{1F600}\\x",
  "NUL¹",
  "NUL\u{1F600}",
];

// ── unary string functions over the whole vocabulary ────────────────
for (const p of paths) {
  emit("normalize", [p], win32.normalize(p));
  emit("dirname", [p], win32.dirname(p));
  emit("basename", [p], win32.basename(p));
  emit("extname", [p], win32.extname(p));
  emit("isAbsolute", [p], String(win32.isAbsolute(p)));
  emit("toNamespacedPath", [p], win32.toNamespacedPath(p));
  emit("resolve1", [p], win32.resolve(p));
  // parse's five fields joined by U+0001, and format over them.
  const parsed = win32.parse(p);
  const fields = [parsed.root, parsed.dir, parsed.base, parsed.ext, parsed.name];
  emit("parse", [p], fields.join("\u0001"));
  emit(
    "format",
    [parsed.root, parsed.dir, parsed.base, parsed.name, parsed.ext],
    win32.format(parsed),
  );
}

// ── format's `||` defaults over field subsets ────────────────────────
for (const root of ["", "C:\\", "\\"]) {
  for (const dir of ["", "C:\\", "d", "C:\\d"]) {
    for (const base of ["", "b.x"]) {
      for (const name of ["", "n"]) {
        for (const ext of ["", "e", ".e"]) {
          emit(
            "format",
            [root, dir, base, name, ext],
            win32.format({ root, dir, base, name, ext }),
          );
        }
      }
    }
  }
}

// ── basename with a suffix ───────────────────────────────────────────
const basenamePairs = [
  ["bar.txt", ".txt"],
  [".txt", ".txt"],
  ["foo.TXT", ".txt"],
  ["a\\b\\c.html", ".html"],
  ["a/b/c.html", "html"],
  ["a\\b\\c.html", "c.html"],
  ["aaa\\bbb", "bb"],
  ["aaa\\bbb", "bbb"],
  ["aaa\\bbb", "aaa\\bbb"],
  ["\\aaa\\bbb\\", "bbb"],
  ["x", "longer-than-path"],
  ["file.txt", ""],
  ["C:\\file.txt", ".txt"],
  ["C:foo", "foo"],
  ["C:", "C:"],
  ["C:\\", "\\"],
  ["\\\\server\\share\\f.ext", ".ext"],
  ["a\\b\\c.html\\\\", ".html"],
];
for (const [p, s] of basenamePairs) emit("basenameSuffix", [p, s], win32.basename(p, s));

// ── join over pairs and a few longer packs ───────────────────────────
const joinSeeds = [
  "",
  ".",
  "..",
  "/",
  "\\",
  "//",
  "\\\\",
  "a",
  "a\\",
  "/a",
  "\\a",
  "C:",
  "C:\\",
  "C:a",
  "c:\\x",
  "//server",
  "\\\\server",
  "\\\\server\\share",
  "\\\\?\\C:\\x",
  "\\\\.\\y",
  "CON",
  "NUL:",
  "b:",
  "x:y",
  "..\\up",
  "a b",
];
for (const a of joinSeeds) {
  for (const b of joinSeeds) {
    emit("join2", [a, b], win32.join(a, b));
  }
}
const joinPacks = [
  [],
  [""],
  ["", ""],
  ["/", "//a", "b/"],
  ["\\", "\\\\a", "b\\"],
  ["C:", "file.txt"],
  ["C:", "..", "..", "x"],
  ["//server", "share", "folder"],
  ["\\\\server\\share", "file.txt"],
  ["a", "..", "b", ".", "c"],
  ["C:\\ProgramData", "portless", "service"],
  [" ", "b"],
  ["a", "", "b"],
  ["a", "CON:", "b"],
  ["x", "nul", "y"],
  ["\\\\?\\UNC\\s\\sh", "f"],
  ["C:\\", "windows\\..\\temp\\", ""],
];
for (const pack of joinPacks) emit(`join${pack.length}`, pack, win32.join(...pack));

// ── resolve over pairs and packs (cwd "/" on both sides) ─────────────
const resolveSeeds = [
  "",
  ".",
  "..",
  "/",
  "\\",
  "a",
  "a\\b",
  "/a",
  "\\a\\b",
  "C:",
  "c:",
  "C:\\",
  "C:\\a",
  "C:a",
  "d:x",
  "D:\\y",
  "//server/share",
  "\\\\server\\share\\x",
  "\\\\.\\dev",
  "\\\\?\\C:\\q",
  "..\\..\\up",
  "rel/x",
];
for (const a of resolveSeeds) {
  for (const b of resolveSeeds) {
    emit("resolve2", [a, b], win32.resolve(a, b));
  }
}
const resolvePacks = [
  [],
  ["c:\\blah\\blah", "d:/games", "c:../a"],
  ["c:/blah\\blah", "d:/games", "c:../a"],
  ["c:/ignore", "d:\\a/b\\c/d", "\\e.exe"],
  ["c:/ignore", "c:/some/file"],
  ["d:/ignore", "d:some/dir//"],
  ["//server/share", "..", "relative\\"],
  ["c:/", "//"],
  ["c:/", "//dir"],
  ["c:/", "//server/share"],
  ["c:/", "//server//share"],
  ["c:/", "///some//dir"],
  ["C:\\foo\\tmp.3\\", "..\\tmp.3\\cycles\\root.js"],
  ["\\\\.\\PHYSICALDRIVE0", "x"],
  ["a", "b", "c"],
  ["", ""],
];
for (const pack of resolvePacks) emit(`resolve${pack.length}`, pack, win32.resolve(...pack));

// ── relative over pairs (ASCII-only pairs: Node folds Unicode case,
// the C port folds ASCII — see the header comment) ───────────────────
const relativeSeeds = [
  "c:/blah\\blah",
  "d:/games",
  "c:/aaaa/bbbb",
  "c:/aaaa",
  "C:/AAAA",
  "c:/aaaa/bbbb/cccc",
  "c:/AaAa/bbbb",
  "c:/aaaaa/",
  "C:\\foo\\bar\\baz",
  "C:\\foo\\bar",
  "c:/",
  "C:\\",
  "\\\\server\\share\\a",
  "\\\\server\\share\\a\\b",
  "\\\\Server2\\share\\x",
  "a",
  "a\\b",
  "..",
  ".",
  "",
  "/",
  "\\",
  "C:\\foo\\test",
  "C:\\foo\\test\\aaa\\bbb",
];
for (const a of relativeSeeds) {
  for (const b of relativeSeeds) {
    emit("relative", [a, b], win32.relative(a, b));
  }
}

// ── seeded fuzz: random path strings over a hostile alphabet ─────────
// xorshift32 so the committed file regenerates identically.
let seed = 0x5c5c2f2f;
const rand = () => {
  seed ^= (seed << 13) >>> 0;
  seed ^= seed >>> 17;
  seed ^= (seed << 5) >>> 0;
  seed >>>= 0;
  return seed / 0x100000000;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const atoms = [
  "/",
  "\\",
  "//",
  "\\\\",
  ".",
  "..",
  "...",
  ":",
  "C:",
  "c:",
  "D:",
  "?",
  "a",
  "b",
  "cc",
  "dir",
  "file.txt",
  ".hidden",
  "x.",
  "..y",
  "CON",
  "nul",
  "COM1",
  "lpt9",
  "AUX",
  "prn",
  "com¹",
  "server",
  "share",
  "UNC",
  " ",
  "a b",
  "%",
  "é",
  "你",
  "\u{1F600}",
  "\xb9",
];
const fuzzPath = () => {
  const n = Math.floor(rand() * 7);
  let s = "";
  for (let i = 0; i < n; i++) s += pick(atoms);
  return s;
};
// ASCII-only atoms for relative (the documented ASCII-vs-Unicode
// case-fold divergence — see the header comment).
/* oxlint-disable no-control-regex -- Keep the path oracle’s case-folding inputs ASCII-only. */
const asciiAtoms = atoms.filter((a) => /^[\x00-\x7f]*$/.test(a));
/* oxlint-enable no-control-regex */
const fuzzAsciiPath = () => {
  const n = Math.floor(rand() * 7);
  let s = "";
  for (let i = 0; i < n; i++) s += pick(asciiAtoms);
  return s;
};

for (let i = 0; i < 4000; i++) {
  const p = fuzzPath();
  emit("normalize", [p], win32.normalize(p));
  emit("dirname", [p], win32.dirname(p));
  emit("basename", [p], win32.basename(p));
  emit("extname", [p], win32.extname(p));
  emit("isAbsolute", [p], String(win32.isAbsolute(p)));
  emit("toNamespacedPath", [p], win32.toNamespacedPath(p));
}
for (let i = 0; i < 2500; i++) {
  const a = fuzzPath();
  const b = fuzzPath();
  emit("join2", [a, b], win32.join(a, b));
  emit("resolve2", [a, b], win32.resolve(a, b));
}
for (let i = 0; i < 1500; i++) {
  const a = fuzzPath();
  const b = fuzzPath();
  const c = fuzzPath();
  emit("join3", [a, b, c], win32.join(a, b, c));
  emit("resolve3", [a, b, c], win32.resolve(a, b, c));
}
for (let i = 0; i < 2500; i++) {
  const a = fuzzAsciiPath();
  const b = fuzzAsciiPath();
  emit("relative", [a, b], win32.relative(a, b));
}
for (let i = 0; i < 800; i++) {
  const p = fuzzPath();
  // A random tail of p is a good suffix — but slicing can split a
  // surrogate pair, and a lone surrogate can't cross the UTF-8 hex
  // encoding (the runtime never holds one: strings are well-formed).
  let tail = p.slice(Math.floor(rand() * p.length));
  if (!tail.isWellFormed()) tail = ".txt";
  const s = pick([fuzzPath(), tail, ".txt", ""]);
  emit("basenameSuffix", [p, s], win32.basename(p, s));
}

stdout.write(lines.join("\n") + "\n");

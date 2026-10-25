// path.parse and path.format for the posix and win32 families: roots,
// trailing separators, dot files, extensions, UNC and drive roots, and
// format's `||` defaults, round-tripped through each other.
import * as path from "node:path";
import { format, parse } from "node:path/posix";

const posixCases = [
  "", "/", "//", "///a//", ".", "..", "a/..", ".hidden", "/.hidden", "file.", "a.b.c",
  "/a/b/c/", "./", "../x.y", "/home/user/dir/file.txt", "dir/sub/", "a//b", "/a/.b.c.",
  "..ext", "/foo/bar.baz/", "x/y.z/..", "unicodé/fïle.tşt", "emoji/😀.png",
];
for (const p of posixCases) {
  const parsed = path.posix.parse(p);
  console.log(JSON.stringify(p), JSON.stringify(parsed), JSON.stringify(path.posix.format(parsed)));
}

const winCases = [
  "", "C:", "C:\\", "C:\\a", "c:foo.txt", "\\", "/", "\\\\server\\share", "\\\\server\\share\\",
  "\\\\server\\share\\a\\b.c", "\\\\server", "\\\\server\\", "a/b\\c.d", "\\\\?\\C:\\x.y",
  "C:\\..\\x", "C:\\path\\dir\\file.txt", "C:/mixed/sep/f.e", "\\\\.\\COM1", "dir\\", ".\\.git",
  "C:\\.hidden", "d:\\a\\..",
];
for (const p of winCases) {
  const parsed = path.win32.parse(p);
  console.log(JSON.stringify(p), JSON.stringify(parsed), JSON.stringify(path.win32.format(parsed)));
}

// format's defaults: dir wins over root, base over name + ext, and the
// separator is skipped when dir is the root.
const objects: path.FormatInputPathObject[] = [
  {},
  { root: "/" },
  { dir: "/a" },
  { root: "/", dir: "/" , base: "x" },
  { root: "/", base: "x" },
  { dir: "a", base: "b" },
  { dir: "a", name: "n", ext: "e" },
  { dir: "a", name: "n", ext: ".e" },
  { name: "n" },
  { ext: "e" },
  { base: "", name: "n", ext: "" },
  { root: "/r/", dir: "/r/", name: "x", ext: ".y" },
  { root: "/x", dir: "", base: "b" },
  { dir: undefined, root: undefined, name: "only" },
];
objects.forEach((o, i) => {
  console.log(i, JSON.stringify(path.posix.format(o)), JSON.stringify(path.win32.format(o)));
});

// Named imports, the bare module and typed bindings.
const parsed: path.ParsedPath = parse("/srv/app/index.js");
console.log(parsed.root, parsed.dir, parsed.base, parsed.ext, parsed.name, format(parsed));
const keys = Object.keys(path.parse("x/y.z"));
console.log(keys.join(","), path.format({ dir: "x", base: "y.z" }) === path.join("x", "y.z"));
const back = path.win32.format(path.win32.parse("C:\\Users\\me\\notes.md"));
console.log(back, path.win32.parse(back).name);

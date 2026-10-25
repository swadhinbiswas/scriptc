// path.matchesGlob: *, ?, ** and the dot rules for the posix family,
// through the bare module, the posix namespace and named imports. Every
// row prints one 0/1 answer per path.
import * as path from "node:path";
import { matchesGlob } from "node:path/posix";
import { posix } from "node:path";

const paths = [
  "", ".", "..", "/", "a", "ab", "a.b", "a.js", ".a", ".js", "a/b", "a/b/c", "a/b/c/d", "a/.b",
  "a/.b/c", "a/../b", "./a", "../a", "a//b", "a/b/", "/a", "/a/b/c.js", "//a/b", "x/y/.z.ts",
  "src/lib/index.test.ts", "node_modules/pkg/index.js", "a b", "file.tar.gz", "file.", "1", "a10",
];
const patterns = [
  "", "*", "**", "***", "?", "??", "???", "a", "a*", "*a", "*a*", "a?", "?a", ".*", "*.*", "*.js",
  "**.js", "**/*.js", "**/*", "*/*", "*/**", "**/**", "a/**", "a/**/b", "a/**/*", "**/a", "a/*/c",
  "a/*/*", "/a", "/**", "/*", "//a", "a/b/", "a/b", "./a", "../a", "a/../b", "a/./b", "a/.b", "a/.*",
  ".a", ".a/*", "**/.b", "**/.*", "**/../a", "a/**/../b", "a/../../b", "?/?", "??/*", "*.?", "a??",
  "a/?/c", "a*b*c", "a**b", "**a", "a**", "*/", "**/", "/", "//", ".", "..", "./*", "../*",
  "*.tar.*", "file.*", "*.", "src/**/*.ts", "**/node_modules/**", "x/**/.z.ts", "x/*/.z.ts",
  "a/b/**/c/**/d", "**/b/**", "#a", "!a", "a\\b",
];
for (const pattern of patterns) {
  const row = paths.map((p) => (path.matchesGlob(p, pattern) ? "1" : "0")).join("");
  console.log(JSON.stringify(pattern).padEnd(24), row);
}

// The three spellings are one function on posix hosts.
let agree = 0;
for (const pattern of patterns)
  for (const p of paths)
    if (matchesGlob(p, pattern) === posix.matchesGlob(p, pattern)) agree++;
console.log("agree", agree, patterns.length * paths.length);

// As a predicate over a file list.
const files = ["src/main.ts", "src/util/strings.ts", "src/util/strings.test.ts", "README.md", ".env", "dist/main.js"];
console.log(files.filter((f) => path.matchesGlob(f, "src/**/*.ts")).join(" "));
console.log(files.filter((f) => !path.matchesGlob(f, "**/*.test.ts")).length);
const hidden: boolean = path.matchesGlob(".env", "*");
console.log(hidden, path.matchesGlob(".env", ".*"), path.matchesGlob("dist/main.js", "*/*.js"));

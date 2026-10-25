// fs.globSync over a fixed tree: globstars, braces, extglobs, classes, dot
// files, "." and ".." segments, trailing slashes, literal paths, missing
// directories, absolute patterns and pattern arrays. Results come out in
// Node's walk order over sorted directory listings.
import { globSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "scriptc-glob-"));
for (const dir of ["a/b/c", "src/lib", ".hidden", "node_modules/x", "docs"]) {
  mkdirSync(join(root, dir), { recursive: true });
}
const files = [
  "a/one.ts",
  "a/b/two.ts",
  "a/b/c/three.js",
  "src/index.ts",
  "src/lib/util.ts",
  "src/lib/util.test.ts",
  "README.md",
  ".hidden/secret.ts",
  ".dot.ts",
  "node_modules/x/index.ts",
  "Upper.TS",
  "docs/guide.md",
  "docs/[draft].md",
];
for (const file of files) writeFileSync(join(root, file), "");

const show = (pattern: string | string[]): void => {
  console.log(JSON.stringify(pattern), globSync(pattern, { cwd: root }).join(" "));
};

for (const pattern of [
  "*.ts",
  "*",
  "**",
  "**/*.ts",
  "a/**",
  "a/**/*.js",
  "**/b",
  "**/b/**",
  "src/*",
  "src/**/*.test.ts",
  "{a,src}/*.ts",
  "{a,src}/**/*.{ts,js}",
  "a/{one,missing}.ts",
  "?.ts",
  "a/???.ts",
  "[ab]/*",
  "[!a]*",
  "!(src|node_modules)/*.ts",
  "@(a|src)/*.ts",
  "+(a|b)/**",
  "*.md",
  "docs/\\[draft\\].md",
  ".*",
  "**/.*",
  ".hidden/*",
  "a/b/../one.ts",
  "./a/*.ts",
  "a/./b/*.ts",
  "a/",
  "a/b/",
  "**/",
  "a/b/c/three.js",
  "missing/**",
  "missing",
  "**/node_modules/**",
  "**/*.TS",
  "",
]) {
  show(pattern);
}
show(["*.md", "a/*.ts", "*.md"]);
show(["src/*", "src/**"]);
show([]);

// Absolute patterns answer absolute paths; print them relative to the root.
const absolute = globSync(join(root, "a", "**", "*.ts")).map((p) => p.slice(root.length));
console.log("absolute", absolute.join(" "));
rmSync(root, { recursive: true, force: true });

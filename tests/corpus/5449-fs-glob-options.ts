// fs.globSync options: cwd as an absolute path, a relative path and a file:
// URL; exclude as glob patterns (resolved against cwd, matched on whole
// paths and on directories with a trailing slash) or a function of the
// path; withFileTypes Dirents with name, parentPath (cwd-relative when cwd
// is relative) and the type probes; and followSymlinks.
import { type Dirent, globSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const root = mkdtempSync(join(tmpdir(), "scriptc-glob-options-"));
for (const dir of ["pkg/src/lib", "pkg/test", "pkg/node_modules/dep", "pkg/dist"]) {
  mkdirSync(join(root, dir), { recursive: true });
}
for (const file of [
  "pkg/package.json",
  "pkg/src/index.ts",
  "pkg/src/lib/a.ts",
  "pkg/src/lib/a.test.ts",
  "pkg/test/main.test.ts",
  "pkg/node_modules/dep/index.ts",
  "pkg/dist/index.js",
]) {
  writeFileSync(join(root, file), "{}");
}
let links = true;
try {
  symlinkSync("src", join(root, "pkg", "linked"), "dir");
} catch {
  links = false;
}

const pkg = join(root, "pkg");
console.log("absolute cwd", globSync("**/*.ts", { cwd: pkg }).join(" "));
process.chdir(root);
console.log("relative cwd", globSync("src/*.ts", { cwd: "pkg" }).join(" "));
console.log("url cwd", globSync("*.json", { cwd: pathToFileURL(pkg) }).join(" "));
console.log("default cwd", globSync("pkg/*.json").join(" "));

console.log(
  "exclude patterns",
  globSync("**/*.ts", { cwd: pkg, exclude: ["node_modules/**", "**/*.test.ts"] }).join(" "),
);
console.log("exclude directory", globSync("**", { cwd: pkg, exclude: ["dist/"] }).filter((p) => !p.includes("linked")).join(" "));
console.log(
  "exclude function",
  globSync("**/*.ts", { cwd: pkg, exclude: (path) => path.startsWith("node_modules") || path.endsWith(".test.ts") }).join(
    " ",
  ),
);
const visited: string[] = [];
globSync("src/**", {
  cwd: pkg,
  exclude: (path) => {
    visited.push(path);
    return false;
  },
});
console.log("exclude sees", visited.join(" "));

const describe = (list: Dirent[]): string =>
  list
    .map((d) => {
      const kind = d.isSymbolicLink() ? "link" : d.isDirectory() ? "dir" : d.isFile() ? "file" : "other";
      const parent = d.parentPath.startsWith(root) ? `<root>${d.parentPath.slice(root.length)}` : d.parentPath;
      return `${d.name}:${parent}:${kind}`;
    })
    .join(" ");
console.log("dirents absolute", describe(globSync("src/**", { cwd: pkg, withFileTypes: true })));
console.log("dirents relative", describe(globSync("pkg/src/*", { withFileTypes: true })));
console.log("dirents exclude", describe(globSync("**/*.ts", { cwd: pkg, withFileTypes: true, exclude: ["node_modules/**"] })));
console.log("withFileTypes false", globSync("*", { cwd: pkg, withFileTypes: false }).join(" "));

if (links) {
  console.log("links", globSync("**/*.ts", { cwd: pkg, exclude: ["node_modules/**"] }).join(" "));
  console.log("links followed", globSync("**/*.ts", { cwd: pkg, followSymlinks: true, exclude: ["node_modules/**"] }).join(" "));
  console.log("link entry", describe(globSync("linked", { cwd: pkg, withFileTypes: true })));
  console.log("through link", globSync("linked/lib/*", { cwd: pkg }).join(" "));
} else {
  console.log("links unavailable");
}
console.log("relative check", relative(root, pkg));
process.chdir(tmpdir());
rmSync(root, { recursive: true, force: true });

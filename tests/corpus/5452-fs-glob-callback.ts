// fs.glob's error-first callback form: with and without options, pattern
// arrays, exclude patterns and functions, the error an exclude callback
// throws arriving at the callback. Each call starts after the previous
// callback ran, so the output order does not depend on I/O timing.
import { glob, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = mkdtempSync(join(tmpdir(), "scriptc-glob-callback-"));
mkdirSync(join(root, "lib/inner"), { recursive: true });
for (const file of ["lib/a.js", "lib/b.ts", "lib/inner/c.ts", "top.json"]) writeFileSync(join(root, file), "");
process.chdir(root);

const steps: (() => void)[] = [
  () => glob("lib/**/*.ts", (err, files) => next("no options", err, files)),
  () => glob("**/*.ts", { cwd: "lib" }, (err, files) => next("cwd", err, files)),
  () => glob(["*.json", "lib/*.js"], {}, (err, files) => next("array", err, files)),
  () => glob("**/*", { exclude: ["lib/inner/**"] }, (err, files) => next("exclude patterns", err, files)),
  () => glob("**/*", { exclude: (path) => path.endsWith(".js") }, (err, files) => next("exclude function", err, files)),
  () =>
    glob(
      "**",
      {
        exclude: () => {
          throw new Error("exclude failed");
        },
      },
      (err, files) => next("exclude throws", err, files),
    ),
  () => finish(),
];

function next(label: string, err: NodeJS.ErrnoException | null, files: string[] | undefined): void {
  console.log(label, err ? `error ${err.message}` : null, files === undefined ? "no files" : files.join(" "));
  steps.shift()?.();
}

function finish(): void {
  process.chdir(tmpdir());
  rmSync(root, { recursive: true, force: true });
  console.log("done");
}

steps.shift()?.();

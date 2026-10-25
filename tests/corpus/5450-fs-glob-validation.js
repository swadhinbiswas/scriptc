// fs.glob argument handling from untyped code: Node's ERR_INVALID_ARG_TYPE
// errors for patterns, options, exclude, followSymlinks, cwd and the
// callback, the ERR_INTERNAL_ASSERTION a non-string cwd with exclude
// patterns hits in Node, empty patterns, missing directories, exclude
// callbacks that throw or return non-booleans, and the errors fs.glob's
// callback and fs/promises glob deliver.
import { globSync, glob as globCallback, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { glob } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const any = (value) => /** @type {any} */ (value);
const attempt = (label, run) => {
  try {
    console.log(label, run());
  } catch (error) {
    const e = /** @type {any} */ (error);
    console.log(label, "threw", e.name, e.code, JSON.stringify(e.message));
  }
};

const root = mkdtempSync(join(tmpdir(), "scriptc-glob-validation-"));
mkdirSync(join(root, "a"));
for (const file of ["a/one.ts", "a/two.ts", "top.md"]) writeFileSync(join(root, file), "");
process.chdir(root);

attempt("number pattern", () => globSync(any(5)));
attempt("null pattern", () => globSync(any(null)));
attempt("object pattern", () => globSync(any({})));
attempt("function pattern", () => globSync(any(() => "*")));
attempt("array with a number", () => globSync(any(["*", 5])));
attempt("string options", () => globSync("*", any("x")));
attempt("null options", () => globSync("*", any(null)));
attempt("array options", () => globSync("*", any([])));
attempt("number exclude", () => globSync("*", any({ exclude: 5 })));
attempt("exclude with a number", () => globSync("*", any({ exclude: ["a", 1] })));
attempt("number followSymlinks", () => globSync("*", any({ followSymlinks: 1 })));
attempt("null followSymlinks", () => globSync("*", any({ followSymlinks: null })).join(" "));
attempt("number cwd", () => globSync("*", any({ cwd: 5 })));
attempt("number cwd with exclude", () => globSync("*", any({ cwd: 5, exclude: ["x"] })));
attempt("Buffer cwd", () => globSync("*", any({ cwd: Buffer.from("a") })));
attempt("http URL cwd", () => globSync("*", any({ cwd: new URL("http://example.com/") })));
attempt("missing cwd", () => globSync("*", { cwd: join(root, "missing") }).length);
attempt("empty pattern", () => globSync("").length);
attempt("no patterns", () => globSync([]).length);
attempt("exclude throws", () =>
  globSync("*", {
    exclude: () => {
      throw new RangeError("stop");
    },
  }),
);
attempt("exclude truthy values", () => globSync("**", { exclude: any((p) => (p.endsWith(".ts") ? 1 : "")) }).join(" "));
attempt("missing callback", () => globCallback("*", any(undefined)));
attempt("bad pattern with callback", () => globCallback(any(5), () => console.log("not reached")));

globCallback("a/*.ts", (err, files) => {
  console.log("callback", err, files.join(" "));
  globCallback("*", { cwd: "a" }, (err2, files2) => {
    console.log("callback with options", err2, files2.join(" "));
    globCallback("*", any({ cwd: 5 }), (error) => {
      console.log("callback cwd error", error.name, error.code, error.message);
      void loop();
    });
  });
});

async function loop() {
  const seen = [];
  for await (const path of glob("**/*.ts")) seen.push(path);
  console.log("for await", seen.join(" "));
  try {
    for await (const path of glob(any(5))) console.log("not reached", path);
  } catch (error) {
    const e = /** @type {any} */ (error);
    console.log("for await bad pattern", e.name, e.code);
  }
  process.chdir(tmpdir());
  rmSync(root, { recursive: true, force: true });
}

// util.promisify's other spellings over the lowered targets: a namespace
// member (`promisify(cp.execFile)`), the util namespace's own
// (`util.promisify(...)`), and the { stdout, stderr } result held in a
// variable, passed around and returned instead of destructured at the
// await.
import * as cp from "node:child_process";
import * as fs from "node:fs";
import * as util from "node:util";
import { promisify } from "node:util";

const execFileAsync = promisify(cp.execFile);
const execAsync = util.promisify(cp.exec);
const readFileAsync = util.promisify(fs.readFile);

type Output = { stdout: string; stderr: string };

function describe(r: Output): string {
  return `${JSON.stringify(r.stdout)}/${JSON.stringify(r.stderr)}`;
}

async function run(file: string, args: string[]): Promise<Output> {
  const result = await execFileAsync(file, args);
  return result;
}

async function main(): Promise<void> {
  const held = await execFileAsync("printf", ["held"]);
  console.log("held:", held.stdout, held.stderr === "");
  console.log("passed:", describe(await run("/bin/sh", ["-c", "printf o; printf e >&2"])));
  const results: Output[] = [held, await execAsync("printf shell")];
  console.log("array:", results.map((r) => r.stdout).join(","));
  const text = await readFileAsync(import.meta.filename, "utf8");
  console.log("readFile:", text.startsWith("// util.promisify"));
}
main();

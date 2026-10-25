import * as cp from "node:child_process";
import { promisify } from "node:util";
import * as util from "node:util";

const execAsync = promisify(cp.exec);
const execFileAsync = util.promisify(cp.execFile);

const shell = await execAsync("printf typed-exec; printf err >&2", { cwd: "/" });
const file = await execFileAsync("/bin/sh", ["-c", "printf typed-execfile"]);
console.log(shell.stdout, shell.stderr, file.stdout, file.stderr === "");
try {
  await execAsync("exit 2");
} catch (e) {
  if (e instanceof Error) console.log(JSON.stringify(e.message));
}

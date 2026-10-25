// util.promisify(exec): calls through the binding run the command line
// with /bin/sh -c (execSync's shell) and settle with { stdout, stderr },
// Node's promisified exec. Fulfilled on exit 0 with both streams
// captured; rejected with "Command failed: <command>\n<stderr>" on a
// non-zero exit (a missing command is the shell's exit 127) and on a
// timeout's SIGTERM. Options: encoding utf8, cwd, env (replaces, inline
// spread included), timeout, maxBuffer (accepted, unenforced).
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

async function lineCount(command: string, dir: string): Promise<number> {
  const { stdout } = await execAsync(command, { cwd: dir, encoding: "utf8", maxBuffer: 1 << 20 });
  return Number(stdout.trim());
}

async function main(): Promise<void> {
  const r = await execAsync("printf out; printf err >&2");
  console.log("both:", r.stdout, r.stderr);
  console.log("keys:", Object.keys(r).join(","), JSON.stringify(r));

  const { stdout: piped } = await execAsync("printf 'a\\nb\\nc\\n' | wc -l");
  console.log("pipe:", piped.trim());
  console.log("quoting:", (await execAsync(`printf '%s|' "a b" 'c d' e`)).stdout);
  console.log("cwd:", (await execAsync("pwd", { cwd: "/" })).stdout.trim());
  console.log("lines:", await lineCount("printf '1\\n2\\n' | wc -l", "/"));

  const replaced = await execAsync('printf "[$SCRIPTC_X][$HOME]"', {
    env: { SCRIPTC_X: "only", PATH: process.env.PATH },
  });
  console.log("env:", replaced.stdout);
  const spread = await execAsync('printf "$SCRIPTC_X"', {
    env: { ...process.env, SCRIPTC_X: "spread" },
  });
  console.log("env spread:", spread.stdout);

  const [one, two] = await Promise.all([execAsync("printf one"), execAsync("printf two")]);
  console.log("all:", one.stdout, two.stdout);

  try {
    await execAsync("printf partial; printf failerr >&2; exit 3");
    console.log("no rejection");
  } catch (e) {
    if (e instanceof Error) console.log("fail:", JSON.stringify(e.message));
  }
  try {
    await execAsync("exit 1");
  } catch (e) {
    if (e instanceof Error) console.log("silent fail:", JSON.stringify(e.message));
  }
  try {
    await execAsync("scriptc-definitely-not-a-command");
  } catch (e) {
    if (e instanceof Error) console.log("missing:", e.message.split("\n")[0]);
  }
  try {
    await execAsync("sleep 2", { timeout: 100 });
  } catch (e) {
    if (e instanceof Error) console.log("timeout:", JSON.stringify(e.message));
  }
  console.log("done");
}
main();

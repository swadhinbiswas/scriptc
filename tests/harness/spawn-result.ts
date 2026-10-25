import { spawn } from "node:child_process";

export interface SpawnResult {
  error: Error | undefined;
  signal: NodeJS.Signals | null;
  status: number | null;
  stdout: Buffer;
  stderr: Buffer;
}

/** spawnSync's result without blocking the worker: a test that runs child
 * processes back to back with spawnSync starves Vitest's worker RPC, which
 * fails the run with an unhandled timeout even when every test passes. */
export function spawnResult(
  file: string,
  args: readonly string[],
  options: { cwd: string; timeout: number; env?: NodeJS.ProcessEnv },
): Promise<SpawnResult> {
  return new Promise((resolve) => {
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let error: Error | undefined;
    const child = spawn(file, args, {
      cwd: options.cwd,
      env: options.env,
      timeout: options.timeout,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", (cause) => {
      error = cause;
    });
    child.on("close", (status, signal) =>
      resolve({
        error,
        signal,
        status,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      }),
    );
  });
}

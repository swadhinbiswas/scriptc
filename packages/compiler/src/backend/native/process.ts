import { execFile } from "node:child_process";
import { promisify } from "node:util";

export const execFileAsync = promisify(execFile);

/** Structured compiler-driver failure. Most callers still let this surface
 * as an internal build error; the TypeScript compiler pipeline recognizes it
 * when an outbound FFI profile is active and turns user-controlled native
 * link failures into SC5004. */
export class CcCompileError extends Error {
  constructor(
    readonly driver: string,
    readonly stderr: string,
    message: string,
  ) {
    super(message);
    this.name = "CcCompileError";
  }
}

/** Preserve the useful output from a failed compiler/tool invocation. Node's
 * execFile error exposes stderr and stdout independently, but either stream
 * may be present as an empty string. Prefer compiler diagnostics, retain a
 * non-standard stdout diagnostic when that is all the tool emitted, and only
 * then fall back to the process error itself. */
export function subprocessFailureDetail(err: unknown): string {
  const failure = err as {
    stderr?: string | Buffer;
    stdout?: string | Buffer;
    message?: string;
  };
  const output = (value: string | Buffer | undefined): string => {
    const text = Buffer.isBuffer(value) ? value.toString("utf8") : (value ?? "");
    return text.trim().length > 0 ? text.trimEnd() : "";
  };
  const stderr = output(failure.stderr);
  const stdout = output(failure.stdout);
  if (stderr !== "" && stdout !== "") return `${stderr}\n\ncompiler stdout:\n${stdout}`;
  if (stderr !== "") return stderr;
  if (stdout !== "") return `compiler stdout:\n${stdout}`;
  if (typeof failure.message === "string" && failure.message.trim() !== "") {
    return failure.message;
  }
  return String(err);
}

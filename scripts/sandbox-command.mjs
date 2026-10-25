export const MAX_INLINE_SANDBOX_COMMAND_BYTES = 768;
// Outside the shell exit-code range, so an actual exit 125 stays a failure.
export const REMOTE_COMMAND_PENDING = 256;

/** A transport failure cannot determine the remote command's exit status. */
export async function waitForSandboxCommand(probe, { deadline, label, onPending }) {
  let lastError;
  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(`${label} did not confirm completion before its timeout`, {
        cause: lastError,
      });
    }
    try {
      await probe(remaining);
      return;
    } catch (error) {
      if (error.remoteExitCode !== undefined && error.remoteExitCode !== REMOTE_COMMAND_PENDING)
        throw error;
      lastError = error;
      onPending(error);
      const delay = Math.min(1000, deadline - Date.now());
      if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export const shellQuote = (value) => `'${value.replaceAll("'", `'"'"'`)}'`;

/** Keep long shell programs out of the local CLI's argument vector. The
 * same script records the remote exit status for either transport. */
export function sandboxCommand(command, args, exitMarker) {
  const statusPath = `/tmp/${exitMarker}.status`;
  const logPath = `/tmp/${exitMarker}.log`;
  const pendingStatus = statusPath + ".pending";
  const script =
    `( ${[command, ...args].map(shellQuote).join(" ")}; scriptc_status=$?; ` +
    `printf '%s\\n' "$scriptc_status" > ${shellQuote(pendingStatus)} ) 2>&1 | tee ${shellQuote(logPath)}; ` +
    `mv ${shellQuote(pendingStatus)} ${shellQuote(statusPath)}; ` +
    `scriptc_status=$(cat ${shellQuote(statusPath)}); ` +
    `printf '\\n${exitMarker}%s\\n' "$scriptc_status"`;
  const scriptPath = `/tmp/${exitMarker}.sh`;
  const file = Buffer.byteLength(script, "utf8") > MAX_INLINE_SANDBOX_COMMAND_BYTES;
  return {
    script,
    scriptPath,
    statusPath,
    logPath,
    file,
    argv: file ? ["sh", scriptPath] : ["sh", "-c", script],
  };
}

/** Allow a disconnected command to finish before probing its recorded exit. */
export function sandboxStatusCommand(statusPath, exitMarker, waitSeconds = 20) {
  if (!Number.isSafeInteger(waitSeconds) || waitSeconds < 0) {
    throw new Error("status wait must be a nonnegative integer");
  }
  return (
    `scriptc_wait=${waitSeconds}; ` +
    `while test ! -s ${shellQuote(statusPath)} && test "$scriptc_wait" -gt 0; do ` +
    `sleep 1; scriptc_wait=$((scriptc_wait - 1)); done; ` +
    `scriptc_status=${REMOTE_COMMAND_PENDING}; test ! -s ${shellQuote(statusPath)} || ` +
    `scriptc_status=$(cat ${shellQuote(statusPath)}); ` +
    `printf '\\n${exitMarker}%s\\n' "$scriptc_status"`
  );
}

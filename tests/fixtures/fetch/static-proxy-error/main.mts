// Prints a failed fetch's error and its cause chain: name, message and
// code at each level, plus the system error fields Node sets.
function describe(value: unknown): string {
  const error = value as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
    errno?: unknown;
    syscall?: unknown;
    address?: unknown;
    port?: unknown;
  };
  return `${String(error.name)} | ${String(error.message)} | ${String(error.code)} | ${String(error.errno)} | ${String(error.syscall)} | ${String(error.address)} | ${String(error.port)}`;
}

try {
  const response = await fetch(process.argv[2]);
  console.log(response.status, await response.text());
} catch (error) {
  let level: unknown = error;
  for (let depth = 0; level !== undefined && depth < 4; depth++) {
    console.log(depth, describe(level));
    level = (level as { cause?: unknown }).cause;
  }
}

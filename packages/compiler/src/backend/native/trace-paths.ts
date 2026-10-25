import { driverTraceCandidates } from "../link-trace.js";
import { lstat } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

export async function existingDriverTracePaths(
  output: string,
  cwd: string,
  excludedRoot: string,
): Promise<string[]> {
  const candidates = new Set<string>();
  for (const line of output.split(/\r?\n/)) {
    const tokens = driverTraceCandidates(line);
    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index]!;
      const joinedPathOption = ["-I", "-L", "-F"].find(
        (option) => token.startsWith(option) && token.length > option.length,
      );
      const equalsPathOption = ["--sysroot=", "-resource-dir="].find((option) =>
        token.startsWith(option),
      );
      const separatePathOptions = [
        "-I",
        "-L",
        "-F",
        "--sysroot",
        "-isysroot",
        "-resource-dir",
        "-isystem",
        "-iquote",
        "-internal-isystem",
        "-internal-externc-isystem",
        "-internal-iframework",
      ];
      const optionPath =
        joinedPathOption !== undefined
          ? token.slice(joinedPathOption.length)
          : equalsPathOption !== undefined
            ? token.slice(equalsPathOption.length)
            : separatePathOptions.includes(token)
              ? (tokens[index + 1] ?? "")
              : token;
      if (!isAbsolute(optionPath)) continue;
      const path = resolve(cwd, optionPath);
      if (
        path === excludedRoot ||
        path.startsWith(`${excludedRoot}/`) ||
        path.startsWith(`${excludedRoot}\\`)
      ) {
        continue;
      }
      candidates.add(path);
    }
  }
  const existing = await Promise.all(
    [...candidates].map(async (path) => [path, await lstat(path).catch(() => null)] as const),
  );
  return existing
    .filter(
      (entry): entry is readonly [string, NonNullable<(typeof entry)[1]>] => entry[1] !== null,
    )
    .map(([path]) => path)
    .sort();
}
export function normalizedProbeInvocation(
  result: { stdout: string; stderr: string },
  probeDir: string,
): string {
  return (
    `${result.stdout}\n${result.stderr}`
      // Probe-local paths vary on every invocation and carry no toolchain
      // identity. Both ordinary and shell-escaped Windows spellings can appear
      // in a driver's quoted trace.
      .split(probeDir)
      .join("<probe>")
      .split(probeDir.replace(/\\/g, "\\\\"))
      .join("<probe>")
      .trim()
  );
}

/** Extract cc1 executable spellings without resolving them. Multiple compiler
 * commands remain ambiguous; the identity callers decide whether to refuse or
 * fingerprint that posture. */
export function effectiveCompilerSpellings(result: { stdout: string; stderr: string }): string[] {
  const spellings: string[] = [];
  for (const line of `${result.stdout}\n${result.stderr}`.split(/\r?\n/)) {
    const tokens = driverTraceCandidates(line);
    const cc1 = tokens.indexOf("-cc1");
    if (cc1 > 0) spellings.push(tokens[cc1 - 1]!);
  }
  return spellings;
}

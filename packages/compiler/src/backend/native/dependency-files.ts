import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

interface FingerprintDependencies {
  paths: string[];
  /** Content identity computed while the enclosing fingerprint was minted.
   * Null means the fingerprint has no file-content component. */
  contentPaths: string[];
  contentFingerprint: string | null;
}

/** Dependency paths discovered while computing one strict fingerprint. The
 * output-local cache stamp snapshots these exact files/directories after a
 * validated build, then can prove a later same-output no-op without spawning
 * clang again. The content identity closes the gap between hashing and that
 * metadata snapshot: a file changed in the gap cannot make new bytes ride an
 * old key. Keep the map bounded for long-lived corpus/test processes. */
const fingerprintDependencies = new Map<string, FingerprintDependencies>();
export function rememberFingerprintDependencies(
  fingerprint: string,
  paths: readonly string[],
  contentPaths: readonly string[] = [],
  contentFingerprint: string | null = null,
): string {
  fingerprintDependencies.set(fingerprint, {
    paths: [...new Set(paths)].sort(),
    contentPaths: [...new Set(contentPaths)].sort(),
    contentFingerprint,
  });
  if (fingerprintDependencies.size > 256) {
    const oldest = fingerprintDependencies.keys().next().value as string | undefined;
    if (oldest !== undefined) fingerprintDependencies.delete(oldest);
  }
  return fingerprint;
}

export function fingerprintDependencyPaths(fingerprint: string): string[] {
  return fingerprintDependencies.get(fingerprint)?.paths ?? [];
}

export function parseMakeDependencies(output: string, cwd: string = process.cwd()): string[] {
  const flattened = output.replace(/\\\r?\n/g, " ");
  const separator = flattened.indexOf(": ");
  if (separator < 0) throw new Error("compiler dependency probe returned no make rule");
  const input = flattened.slice(separator + 2);
  const paths: string[] = [];
  let current = "";
  let escaped = false;
  for (const char of input) {
    if (escaped) {
      current += char;
      escaped = false;
    } else if (char === "\\") {
      escaped = true;
    } else if (/\s/.test(char)) {
      if (current !== "") {
        paths.push(current.replace(/\$\$/g, "$"));
        current = "";
      }
    } else {
      current += char;
    }
  }
  if (escaped) current += "\\";
  if (current !== "") paths.push(current.replace(/\$\$/g, "$"));
  return [...new Set(paths.map((path) => resolve(cwd, path)))].sort();
}

export async function fingerprintDependencyFiles(paths: readonly string[]): Promise<string> {
  const hash = createHash("sha256").update("implicit-dependencies-v1\0");
  for (let i = 0; i < paths.length; i += 128) {
    const batch = paths.slice(i, i + 128);
    const contents = await Promise.all(batch.map((path) => readFile(path)));
    for (let j = 0; j < batch.length; j++) {
      hash.update(batch[j]!).update("\0").update(contents[j]!).update("\0");
    }
  }
  return hash.digest("hex");
}

export async function fingerprintDependenciesStillMatch(
  fingerprints: readonly string[],
): Promise<boolean> {
  const distinct = [...new Set(fingerprints)];
  const identities = distinct
    .map((fingerprint) => fingerprintDependencies.get(fingerprint))
    // A restored native-metadata stamp carries and revalidates the dependency
    // snapshot from the process that minted this fingerprint. Only identities
    // computed in this process have an additional content hash to recheck here.
    .filter((identity): identity is FingerprintDependencies => identity !== undefined);
  return (
    await Promise.all(
      identities.map(
        async (identity) =>
          identity.contentFingerprint === null ||
          (await fingerprintDependencyFiles(identity.contentPaths).catch(() => null)) ===
            identity.contentFingerprint,
      ),
    )
  ).every(Boolean);
}

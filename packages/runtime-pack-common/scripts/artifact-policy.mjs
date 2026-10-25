import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/**
 * Zig's C driver enables UBSan for -O0, its Debug mode, on every target. The
 * dev flavors are plain -O0 builds, so the checks would make their objects
 * several times larger than release and leave them calling Zig's UBSan
 * runtime. Every pack compiles the runtime and vendored code without them
 * and rejects artifacts that still reference the handlers.
 */
export const RUNTIME_COMPILE_FLAGS = ["-fno-sanitize=undefined"];
const RUNTIME_FORBIDDEN_STRINGS = ["__ubsan_"];

export function runtimeForbiddenStrings(packStrings = []) {
  return [...new Set([...RUNTIME_FORBIDDEN_STRINGS, ...packStrings])];
}

export async function assertArtifactsExcludeStrings(root, forbiddenStrings) {
  if (!Array.isArray(forbiddenStrings)) {
    throw new Error("runtime-pack forbidden artifact strings must be an array");
  }
  if (forbiddenStrings.length === 0) return;
  if (forbiddenStrings.some((value) => typeof value !== "string" || value.length === 0)) {
    throw new Error("runtime-pack forbidden artifact strings must be non-empty strings");
  }
  const forbidden = forbiddenStrings.map((value) => ({ value, bytes: Buffer.from(value) }));
  const visit = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
        continue;
      }
      if (!entry.isFile()) continue;
      const bytes = await readFile(path);
      const match = forbidden.find((candidate) => bytes.includes(candidate.bytes));
      if (match !== undefined) {
        const artifact = relative(root, path).split(sep).join("/");
        throw new Error(
          `runtime-pack artifact ${artifact} contains forbidden symbol family ${match.value}`,
        );
      }
    }
  };
  await visit(root);
}

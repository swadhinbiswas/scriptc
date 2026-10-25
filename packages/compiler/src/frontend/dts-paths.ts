import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { npmPackageNameOf } from "./workspace-registry.js";
import { tsgoPath } from "./ts7/session-path.js";

export { tsgoPath } from "./ts7/session-path.js";

const require = createRequire(import.meta.url);
let installedDeclarationRoot: string | null = null;

/** A native distribution supplies its relocatable declaration directory. */
export function setDeclarationRoot(root: string): void {
  installedDeclarationRoot = root;
}

function declarationPath(name: string): string {
  return tsgoPath(
    installedDeclarationRoot === null
      ? name === "scriptc.d.ts"
        ? require.resolve("@scriptc/compiler/scriptc.d.ts")
        : name === "scriptc-overrides.d.ts"
          ? require.resolve("@scriptc/compiler/scriptc-overrides.d.ts")
          : require.resolve("@scriptc/compiler/scriptc-node-fallback.d.ts")
      : join(installedDeclarationRoot, name),
  );
}

/** Directory of the shipped package shims (packages/compiler/shims): the
 * implementation modules package-shims.ts maps npm packages to. A native
 * distribution ships them beside its declarations. */
export function packageShimRoot(): string {
  return installedDeclarationRoot === null
    ? join(dirname(require.resolve("@scriptc/compiler/scriptc.d.ts")), "..", "shims")
    : join(installedDeclarationRoot, "shims");
}

/** The directories of files scriptc itself ships, each with the prefix
 * that names its files independently of where scriptc is installed
 * (compilerOwnedFileName). IR artifacts spell source locations in them this
 * way (serializeModuleParts). */
export function compilerOwnedFileRoots(): readonly { from: string; to: string }[] {
  return [{ from: tsgoPath(packageShimRoot()) + "/", to: "scriptc:shims/" }];
}

/** The name of a file scriptc itself ships (a package shim or one of the
 * shipped declaration files) that does not depend on where scriptc is
 * installed: `scriptc:shims/<path below the shim root>` or
 * `scriptc:<declaration file name>`. Null for every other file. Names and
 * artifacts that would otherwise spell the installation's absolute path use
 * it, so two installations of one compiler emit the same output. */
export function compilerOwnedFileName(file: string): string | null {
  const path = tsgoPath(file);
  for (const { from, to } of compilerOwnedFileRoots()) {
    if (path.startsWith(from)) return to + path.slice(from.length);
  }
  for (const declaration of [ambientDtsPath(), overridesDtsPath(), fallbackDtsPath()]) {
    if (path === declaration) return `scriptc:${path.slice(path.lastIndexOf("/") + 1)}`;
  }
  return null;
}

/** Path of the shipped ambient declarations — the always-shipped CORE
 * (comptime, setTimeout). Part of EVERY program scriptc
 * builds, the project-world preflight program included. */
export function ambientDtsPath(): string {
  return declarationPath("scriptc.d.ts");
}

/** Path of the shipped divergence/precision OVERRIDES (JSON.parse():
 * unknown, pop(): T, the Promise executor shape, ...). Part of the LOWERING
 * program only — preflight's project-world second chance builds without it,
 * so a project that typechecks under its own tsc never fails preflight over
 * an override-manufactured error (checkPreflight). */
export function overridesDtsPath(): string {
  return declarationPath("scriptc-overrides.d.ts");
}

/** Path of the shipped FALLBACK declarations (console, process, node:fs) —
 * part of the program only when the target project has no @types/node.
 * With @types/node, the project's real Node types stand in and this file
 * stands down (its declaration forms would collide). */
export function fallbackDtsPath(): string {
  return declarationPath("scriptc-node-fallback.d.ts");
}

/** True for files belonging to the adopted Node type surface: the
 * @types/node package itself and undici-types (its dependency — the
 * web-platform globals: fetch/Response/AbortSignal/ReadableStream/...).
 * The provenance half of the lowering tables' recognition when the
 * fallback declarations stand down, and of the SC2020-family fence for
 * everything else those packages declare. */
export function isNodeTypesPath(file: string): boolean {
  const pkg = npmPackageNameOf(file);
  return pkg === "@types/node" || pkg === "undici-types";
}

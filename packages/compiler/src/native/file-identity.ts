import { realpathSync, statSync } from "node:fs";
import { resolve } from "node:path";

/** ctime and inode identity detect replaced or rewritten tools even when
 * their size and mtime are preserved. Avoid hashing entire compiler binaries
 * on every build; source observations still use their content digests. */
export function nativeFileIdentity(path: string): string {
  path = resolve(path);
  const info = statSync(path);
  if (!info.isFile()) throw new Error(`native compiler input is not a file: ${path}`);
  return JSON.stringify({
    path,
    canonical: realpathSync(path),
    dev: info.dev,
    ino: info.ino,
    size: info.size,
    mtime: info.mtimeMs,
    ctime: info.ctimeMs,
  });
}

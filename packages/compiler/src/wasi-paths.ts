import { tmpdir } from "node:os";
import * as posix from "node:path/posix";
import * as win32 from "node:path/win32";

export type HostPathFlavor = "posix" | "win32";

/** Translate a host path into the namespace exposed by scriptc's WASI
 * runner. The caller's working tree is guest `/`; the host temp directory
 * is guest `/tmp`. Paths outside both capabilities have no guest spelling. */
export function wasiGuestPath(
  hostPath: string,
  cwd: string = process.cwd(),
  hostTmp: string = tmpdir(),
  flavor: HostPathFlavor = process.platform === "win32" ? "win32" : "posix",
): string | null {
  const windows = flavor === "win32";
  const separator = windows ? win32.sep : posix.sep;
  const absolute = windows ? win32.resolve(cwd, hostPath) : posix.resolve(cwd, hostPath);

  const under = (hostRoot: string, guestRoot: string): string | null => {
    const root = windows ? win32.resolve(hostRoot) : posix.resolve(hostRoot);
    const relative = windows ? win32.relative(root, absolute) : posix.relative(root, absolute);
    if (relative === "") return guestRoot;
    if (
      relative === ".." ||
      relative.startsWith(`..${separator}`) ||
      (windows ? win32.isAbsolute(relative) : posix.isAbsolute(relative))
    ) {
      return null;
    }
    return posix.join(guestRoot, relative.split(separator).join("/"));
  };

  return under(cwd, "/") ?? under(hostTmp, "/tmp");
}

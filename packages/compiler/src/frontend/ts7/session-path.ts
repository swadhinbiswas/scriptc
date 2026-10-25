/** TypeScript's protocol uses platform-independent path keys, including
 * bundled-library URLs and Windows paths on non-Windows clients. Do not
 * canonicalize these with the client's host-specific node:path rules. */
// Normalization follows typescript@7.0.2's path helpers, Copyright Microsoft
// Corporation, licensed under Apache-2.0. Preserve the pinned key spelling.
function volume(code: number): boolean {
  return (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function encodedRootLength(path: string): number {
  if (path.length === 0) return 0;
  const first = path.charCodeAt(0);
  if (first === 47) {
    if (path.charCodeAt(1) !== 47) return 1;
    const slash = path.indexOf("/", 2);
    return slash < 0 ? path.length : slash + 1;
  }
  if (volume(first) && path.charCodeAt(1) === 58) {
    if (path.charCodeAt(2) === 47) return 3;
    if (path.length === 2) return 2;
  }
  const schemeEnd = path.indexOf("://");
  if (schemeEnd < 0) return 0;
  const authorityStart = schemeEnd + 3;
  const authorityEnd = path.indexOf("/", authorityStart);
  if (authorityEnd < 0) return ~path.length;
  const authority = path.slice(authorityStart, authorityEnd);
  if (
    path.slice(0, schemeEnd) === "file" &&
    (authority === "" || authority === "localhost") &&
    volume(path.charCodeAt(authorityEnd + 1))
  ) {
    const start = authorityEnd + 2;
    const end =
      path.charCodeAt(start) === 58
        ? start + 1
        : path.slice(start, start + 3).toLowerCase() === "%3a"
          ? start + 3
          : -1;
    if (end >= 0) {
      if (path.charCodeAt(end) === 47) return ~(end + 1);
      if (end === path.length) return ~end;
    }
  }
  return ~(authorityEnd + 1);
}

function slashes(path: string): string {
  return path.split("\\").join("/");
}

const relativeSegments = /\/\/|(?:^|\/)\.\.?(?:$|\/)/;

function simplePath(path: string): string | undefined {
  if (!relativeSegments.test(path)) return path;
  let simplified = path.replace(/\/\.\//g, "/");
  if (simplified.startsWith("./")) simplified = simplified.slice(2);
  if (simplified !== path && !relativeSegments.test(simplified)) return simplified;
  return undefined;
}

function withoutTrailing(path: string): string {
  return path.endsWith("/") ? path.slice(0, -1) : path;
}

function normalizeAbsolute(path: string, rootLength: number): string {
  const simple = simplePath(path);
  if (simple !== undefined) return simple.length > rootLength ? withoutTrailing(simple) : simple;
  const root = path.slice(0, rootLength);
  let normalized = "";
  let initialized = false;
  let index = rootLength;
  let normalizedUpTo = index;
  let seenNonDotDot = rootLength !== 0;
  while (index < path.length) {
    let segmentStart = index;
    let code = path.charCodeAt(index);
    while (code === 47 && index + 1 < path.length) {
      code = path.charCodeAt(++index);
    }
    if (index > segmentStart) {
      if (!initialized) {
        normalized = path.slice(0, segmentStart - 1);
        initialized = true;
      }
      segmentStart = index;
    }
    let end = path.indexOf("/", index + 1);
    if (end < 0) end = path.length;
    const length = end - segmentStart;
    if (length === 1 && code === 46) {
      if (!initialized) {
        normalized = path.slice(0, normalizedUpTo);
        initialized = true;
      }
    } else if (length === 2 && code === 46 && path.charCodeAt(index + 1) === 46) {
      if (!seenNonDotDot) {
        if (initialized) normalized += normalized.length === rootLength ? ".." : "/..";
        else normalizedUpTo = index + 2;
      } else if (!initialized) {
        initialized = true;
        normalized =
          normalizedUpTo >= 2
            ? path.slice(0, Math.max(rootLength, path.lastIndexOf("/", normalizedUpTo - 2)))
            : path.slice(0, normalizedUpTo);
      } else {
        const slash = normalized.lastIndexOf("/");
        normalized = slash < 0 ? root : normalized.slice(0, Math.max(rootLength, slash));
        if (normalized.length === rootLength) seenNonDotDot = rootLength !== 0;
      }
    } else if (initialized) {
      if (normalized.length !== rootLength) normalized += "/";
      seenNonDotDot = true;
      normalized += path.slice(segmentStart, end);
    } else {
      seenNonDotDot = true;
      normalizedUpTo = end;
    }
    index = end + 1;
  }
  return initialized ? normalized : path.length > rootLength ? withoutTrailing(path) : path;
}

/** Canonical identity follows the server's case-sensitivity, independently
 * of the platform hosting the client. Rooted disk paths retain a trailing
 * slash, while paths resolved against a working directory do not. */
export class Ts7Paths {
  constructor(
    readonly currentDirectory: string,
    readonly caseSensitive: boolean,
  ) {
    if (encodedRootLength(slashes(currentDirectory)) <= 0)
      throw new Error("TypeScript working directory must be an absolute disk path");
  }

  canonical(file: string): string {
    let path = slashes(file);
    let encoded = encodedRootLength(path);
    const disk = encoded > 0;
    if (encoded === 0 && this.currentDirectory.length > 0) {
      const cwd = slashes(this.currentDirectory);
      path = cwd + (cwd.endsWith("/") || path.length === 0 ? "" : "/") + path;
      encoded = encodedRootLength(path);
    }
    const rootLength = encoded < 0 ? ~encoded : encoded;
    const simple = disk ? simplePath(path) : undefined;
    let result = simple ?? normalizeAbsolute(path, rootLength);
    if (
      simple === undefined &&
      disk &&
      path.endsWith("/") &&
      result !== "" &&
      !result.endsWith("/")
    )
      result += "/";
    return this.caseSensitive ? result : result.toLowerCase();
  }
}

/** Preserve TypeScript's URI spelling, including escaped virtual names.
 * Local file URLs decode their path; UNC URLs preserve escaped path bytes
 * just as the pinned SDK does. */
export function ts7DocumentFile(document: string | { uri: string }): string {
  if (typeof document === "string") return document;
  const uri = document.uri;
  if (uri.startsWith("bundled:///")) return uri;
  if (uri.startsWith("file://")) {
    let parsed: URL;
    try {
      parsed = new URL(uri);
    } catch {
      throw new Error("invalid file URI: " + uri);
    }
    if (parsed.host !== "") return "//" + parsed.host + parsed.pathname;
    const path = decodeURIComponent(parsed.pathname);
    if (
      path.length >= 3 &&
      path.charCodeAt(0) === 47 &&
      volume(path.charCodeAt(1)) &&
      path.charCodeAt(2) === 58
    ) {
      return path.slice(1, 3).toLowerCase() + path.slice(3);
    }
    return path;
  }
  const colon = uri.indexOf(":");
  if (colon < 0) throw new Error("invalid URI: " + uri);
  const scheme = uri.slice(0, colon);
  let path = uri.slice(colon + 1);
  let authority = "ts-nul-authority";
  if (path.startsWith("//")) {
    const rest = path.slice(2);
    const slash = rest.indexOf("/");
    if (slash < 0) throw new Error("invalid URI: " + uri);
    authority = rest.slice(0, slash);
    path = rest.slice(slash + 1);
  }
  return "^/" + scheme + "/" + authority + "/" + path;
}
/** tsgo's file identities use slashes on Windows. POSIX backslashes are
 * literal filename characters and must survive callback round trips. */
export function tsgoPath(path: string, platform: NodeJS.Platform = process.platform): string {
  return platform === "win32" ? path.replace(/\\/g, "/") : path;
}

// Generates file-URL-bridge win32 test cases with Node as the oracle:
// fileURLToPath(url, { windows: true }) and
// pathToFileURL(path, { windows: true }).href — the same code Windows
// Node dispatches to, exposed as options since v22, so the win32 arm
// differential-tests byte-exactly on any host.
//
//   node gen-url-cases.mjs > url-cases.txt
//
// Each line: <op>\t<arg-hex>\t<expected-hex>; expected is "OK:<value>" or
// "ERR:<name>: <message>" (the fields test_url.c compares). Node v24
// required; chdir("/") first (pathToFileURL resolves relative paths
// against the cwd — test_url.c chdir's to the same place).
//
// Deliberately EXCLUDED (documented divergences, see scr_url.c):
//   - URLs the runtime's parser rejects that Node accepts: IPv6 hosts,
//     non-ASCII/punycode hosts, and the WHATWG windows-drive "c|" quirk.
//   - Percent sequences that make Node's decodeURIComponent throw
//     URIError ("%zz", trailing "%") — the runtime passes them through
//     verbatim (it has no URIError; same stance as the posix arm).
//   - pathToFileURL inputs hitting Node's HOST-conditional trailing-slash
//     comparison (`resolved[last] !== path.sep` reads the HOST's sep, so
//     Node-on-macOS answers differently than Node-on-Windows for inputs
//     like "C:\\" whose resolved form ends in a backslash): the C port
//     follows Windows Node; the Windows box legs pin those.
//   - Non-ASCII UNC servernames (Node punycodes; the parser has no IDNA)
//     and hostnames with forbidden bytes ('%' — Node ABORTS on a native
//     assert there; the runtime keeps them verbatim instead).
import { fileURLToPath, pathToFileURL } from "node:url";
import { win32 } from "node:path";
import { stdout } from "node:process";

process.chdir("/");

const hex = (str) => {
  const b = Buffer.from(str, "utf8");
  return b.length ? b.toString("hex") : "-";
};

const lines = [];
const emit = (op, arg, fn) => {
  let expected;
  try {
    expected = "OK:" + fn();
  } catch (e) {
    if (e.name === "URIError") return; // excluded: no URIError here
    expected = `ERR:${e.name}: ${e.message}`;
  }
  lines.push([op, hex(arg), hex(expected)].join("\t"));
};

// ── fileURLToPath(url, { windows: true }) ────────────────────────────
const urls = [
  "file:///C:/a%20b",
  "file:///C:/a b",
  "file:///c:/",
  "file:///C:",
  "file:///C:/",
  "file:///C:/x/y/z",
  "file:///C:/x/../y",
  "file:///D:/x%25y",
  "file:///C:/%C3%A9",
  "file:///C:/é🌍",
  "file:///C:/a%2Fb",
  "file:///C:/a%2fb",
  "file:///C:/a%5Cb",
  "file:///C:/a%5cb",
  "file:///C:/a%252fb",
  "file://server/share/x",
  "file://server/share/a%20b",
  "file://SERVER/share",
  "file://server/",
  "file://server",
  "file://server/share/%C3%A9",
  "file://localhost/C:/x",
  "file:///",
  "file:///tmp/x",
  "file:///x:",
  "file:///xy:/",
  "file:///:C/x",
  "file:///2:/x",
  "FILE:///C:/upper",
  "file:c:/x",
  "file:/c:/x",
  "http://x/y",
  "https://server/share",
  "not a url",
  "file:///C:/trailing/",
  "file:///C:/a?query",
  "file:///C:/a#frag",
];
for (const u of urls) emit("u2p", u, () => fileURLToPath(u, { windows: true }));

// ── pathToFileURL(path, { windows: true }).href ──────────────────────
const isHostSepLeak = (p) => {
  // Node's trailing-slash restore compares against the HOST's path.sep;
  // skip inputs where macOS Node and Windows Node answer differently.
  if (p.startsWith("\\\\")) return false; // the UNC arm skips that code
  const resolved = win32.resolve(p);
  if (resolved.startsWith("\\\\")) return false;
  return /[/\\]$/.test(p) && resolved.endsWith("\\");
};
const paths = [
  "C:\\tmp\\a b",
  "C:\\tmp\\a%b",
  "C:/tmp/x",
  "c:\\é you",
  "C:\\😀",
  "C:\\x\\",
  "C:\\x/",
  "relative\\x",
  "rel",
  "",
  ".",
  "..",
  "\\rooted\\x",
  "/rooted/y",
  'C:\\a?#[]^|`{}"<>',
  "C:\\a\nb\tc\rd",
  "C:\\per%25cent",
  "\\\\server\\share",
  "\\\\server\\share\\",
  "\\\\server\\share\\file a",
  "\\\\SERVER\\Share\\X",
  "\\\\server\\share/x b",
  "\\\\server\\share\\a\\..\\b",
  "\\\\server\\share\\.\\a",
  "\\\\server\\share\\a\\\\b",
  "\\\\server\\share\\é",
  "\\\\srv\\sh\\..\\..\\..\\up",
  "\\\\?\\UNC\\srv\\sh\\f",
  "\\\\a/b\\share",
  "\\\\?\\UNC\\srv\\sh\\a\\..\\b",
  "\\\\?\\C:\\x",
  "\\\\.\\dev\\x",
  "\\\\server",
  "\\\\",
  "\\\\\\x",
  "//server/share/a",
  "//server/share/a/../b",
  "D:games\\x",
];
for (const p of paths) {
  if (isHostSepLeak(p)) continue;
  emit("p2u", p, () => pathToFileURL(p, { windows: true }).href);
}

// ── the posix arm (the from_path encoding path is shared code now:
// pin that the rework kept it byte-exact, including the [ ] ^ | and
// trailing-slash behaviors the old corpus never reached) ──────────────
const posixUrls = [
  "file:///tmp/a%20b/c%25d",
  "file:///tmp/%C3%A9",
  "file:///",
  "FILE:///upper",
  "file:///a%2Fb",
  "file://host/a",
  "file://localhost/x",
  "http://x/y",
  "file:///end/",
];
for (const u of posixUrls) emit("u2p-posix", u, () => fileURLToPath(u, { windows: false }));

const posixPaths = [
  "/tmp/a b/c%d",
  "/tmp/é🌍",
  '/a[]^|`{}"<>?#z',
  "/back\\slash",
  "/trailing/",
  "/trailing//",
  "/",
  "rel/x",
  "rel/x/",
  "",
  ".",
  "/a\nb\tc\rd",
];
for (const p of posixPaths) emit("p2u-posix", p, () => pathToFileURL(p, { windows: false }).href);

stdout.write(lines.join("\n") + "\n");

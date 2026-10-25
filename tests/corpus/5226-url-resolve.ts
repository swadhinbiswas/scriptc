// @exit: 1
// url.resolve(from, to): Url.prototype.resolveObject's rules over the RFC
// 1808/3986 grid (dot segments, trailing slashes, query-only and
// fragment-only references, network-path references), protocol changes
// (slashed protocols, file:, hostless and non-slashed schemes), the
// mailto:-style host folding, auth carried and dropped, and empty bases.
// The @exit directive keeps the DEP0169 report (its pid never matches)
// out of the stderr comparison.
import { resolve } from "node:url";

const bases = [
  "http://a/b/c/d;p?q",
  "http://user:pw@host.example:81/dir/file?x#y",
  "https://example.com",
  "http://example.com/one/two/",
  "mailto:local1@domain1",
  "mailto:a@b/c",
  "file:///a/b/c",
  "file://host/share/x",
  "javascript:void(0)",
  "/absolute/path/file",
  "relative/path/file",
  "",
  "//network.example/p",
  "foo://host/a/b",
  "foo:a/b",
  "http://[::1]:8080/a/b",
];
const references = [
  "", "g", "./g", "g/", "/g", "//g", "?y", "g?y", "#s", "g#s", "g?y#s", ";x", "g;x",
  ".", "./", "..", "../", "../g", "../..", "../../", "../../g", "../../../g", "/./g",
  "/../g", "g.", ".g", "g..", "..g", "./../g", "./g/.", "g/./h", "g/../h", "http:g",
  "http://other/c", "https:other", "mailto:x@y", "local2@domain2", "file:///z", "foo:z",
  "//user:pw@other/c", "///triple", "\\back\\slash", " spaced ",
];
for (const base of bases) {
  console.log(JSON.stringify(base));
  console.log("  " + references.map((ref) => `${JSON.stringify(ref)}=${resolve(base, ref)}`).join(" "));
}
try {
  resolve("http://xn--a.example/", "x");
} catch (e) {
  const err = e as Error & { code?: string };
  console.log(err.name, err.code, err.message);
}
process.exitCode = 1;

// url.format(urlObject) over plain objects: Url.prototype.format's rules —
// the ':' and '//' protocol completion (slashed protocols, file:'s bare
// '//', explicit slashes), host winning over hostname and port, IPv6
// bracketing, auth's percent-encoding, query objects through
// querystring.stringify when search is empty, the '?' and '#' prefixes,
// '#' and '?' escapes in the pathname and '#' in the search, number and
// boolean fields, and the ERR_INVALID_ARG_TYPE throw for other values.
// No string is parsed, so no deprecation warning prints.
import { format, type UrlObject } from "node:url";

const objects: UrlObject[] = [
  {},
  { protocol: "http", host: "example.com" },
  { protocol: "https:", hostname: "example.com", port: 8443, pathname: "x/y" },
  { protocol: "http", hostname: "example.com", port: "80", pathname: "/a" },
  { protocol: "http", host: "host.example:1", hostname: "ignored", port: 2 },
  { protocol: "file", pathname: "/etc/hosts" },
  { protocol: "file:" },
  { protocol: "files" },
  { protocol: "mailto", auth: "me", hostname: "example.org" },
  { protocol: "mailto:", pathname: "me@example.org" },
  { protocol: "custom", slashes: true, host: "h", pathname: "p" },
  { protocol: "custom", host: "h", pathname: "p" },
  { protocol: "HTTP", host: "h", pathname: "p" },
  { hostname: "::1", port: 3000 },
  { hostname: "[::1]", port: 3000 },
  { auth: "user:p@ss w/rd", host: "secure.example" },
  { auth: "naïve💩", host: "h" },
  { auth: "dropped", pathname: "/without-host" },
  { pathname: "a#b?c" },
  { protocol: "http:", host: "h", pathname: "#starts-with-hash" },
  { search: "a=1" },
  { search: "?a=1#b" },
  { search: "#x" },
  { protocol: "http", host: "h", query: { a: "1", b: ["2", "3"], c: "x y", d: "" } },
  { query: "ignored=string" },
  { protocol: "http", host: "h", query: { a: "1" }, search: "?b=2" },
  { protocol: "http", host: "h", query: {}, search: "" },
  { hash: "frag" },
  { hash: "#frag" },
  { protocol: "http:", host: "a", pathname: "/", search: "q", hash: "h" },
  { protocol: "http", hostname: "", port: 1, pathname: "/x" },
  { slashes: true, pathname: "x" },
  { slashes: true, hostname: "h" },
  { protocol: "http", auth: "", host: "", hash: "", search: "", pathname: "" },
  { protocol: null, host: null, pathname: null },
  { href: "http://ignored.example/", pathname: "/kept" },
];
for (const o of objects) console.log(JSON.stringify(o), "->", JSON.stringify(format(o)));

const built: UrlObject = { protocol: "https", hostname: "api.example" };
built.pathname = "/v1/items";
built.query = { page: 2, tags: ["a", "b"], on: true };
console.log(format(built));
console.log(format({ protocol: "ftp", host: "files.example", pathname: "pub/file.txt" }));

for (const bad of [42, null, undefined, true]) {
  try {
    format(bad as unknown as UrlObject);
  } catch (e) {
    const err = e as Error & { code?: string };
    console.log(err.name, err.code, err.message);
  }
}
try {
  format({ protocol: "http", host: "h", auth: "lone\ud800" });
} catch (e) {
  const err = e as Error & { code?: string };
  console.log(err.name, err.code, err.message);
}
console.log(format({ protocol: "http", host: "h", auth: "\ud800pair" }));

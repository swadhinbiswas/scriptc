// @exit: 1
// url.parse() answers Node's Url instance: twelve own properties in Node's
// order with null for every part the input lacks, util.inspect's "Url"
// class name (nested and beyond the depth limit too), JSON and key
// enumeration (for...in also visits Url.prototype's five methods), and
// the parsed fields' typed reads. The @exit directive keeps the DEP0169
// report (its pid never matches) out of the stderr comparison.
import { inspect } from "node:util";
import { parse, type Url } from "node:url";

const inputs = [
  "http://user:pw@Example.com:8080/p/a/t/h?query=string#hash",
  "https://example.com",
  "//example.com/no/protocol",
  "/just/a/path?x=1",
  "relative/path#frag",
  "",
  "   ",
  "mailto:someone@example.org?subject=hi",
  "javascript:alert(1)",
  "file:///etc/hosts",
  "ftp://files.example.com/pub/",
  "?only=query",
  "#only-hash",
];
for (const input of inputs) console.log(JSON.stringify(input), parse(input));

const full = parse("http://a.b/c?d#e");
console.log(JSON.stringify(full));
console.log(Object.keys(full).join(","));
const enumerated: string[] = [];
for (const key in full) enumerated.push(key);
console.log(enumerated.join(","));
console.log(inspect({ nested: { deeper: { url: full } } }));
console.log(inspect({ nested: { url: full } }, { depth: 1 }));
console.log([full, parse("x")]);

function summary(u: Url): string {
  const { protocol, slashes, auth, host, port, hostname, hash, search, pathname, path, href } = u;
  const text = (part: string | null): string => (part === null ? "null" : JSON.stringify(part));
  const query = typeof u.query === "string" ? u.query : u.query === null ? "null" : "object";
  return [protocol, auth, host, port, hostname, hash, search, query, pathname, path, href]
    .map(text)
    .join(" | ") + ` | slashes=${slashes}`;
}
for (const input of inputs) console.log(summary(parse(input)));

const parsed = parse("HTTP://Mixed.Case.Example/Path");
if (parsed.hostname !== null) console.log(parsed.hostname.length, parsed.hostname.toUpperCase());
console.log(parsed.slashes === true, parsed.port ?? "default port", parsed.href.length);
parsed.pathname = "/edited";
parsed.hash = "#added";
console.log(parsed.pathname, parsed.hash, parsed.href);
process.exitCode = 1;

// @exit: 1
// url.parse(urlString, parseQueryString): the query string form, the
// parsed null-prototype object (querystring.parse's decoding, '+' as
// space, repeated keys as arrays, array-index keys first), the empty
// object when no query exists, the simple-path fast path, and typed reads
// through UrlWithParsedQuery's ParsedUrlQuery. The @exit directive keeps
// the DEP0169 report (its pid never matches) out of the stderr comparison.
import { inspect } from "node:util";
import { parse } from "node:url";

const inputs = [
  "http://example.com/search?q=node+js&lang=en&lang=fr&empty=&flag",
  "/fast/path?a=1&b=%20two%20&c=%E2%9C%93",
  "/fast/path",
  "http://example.com",
  "?2=two&1=one&b=bee&0=zero",
  "http://example.com/?__proto__=x&constructor=y&hasOwnProperty=z",
  "http://example.com/?a[]=1&a[]=2&a=3",
  "http://example.com/?%zz=bad&ok=%41",
  "http://example.com/p?x=1#frag?not=query",
  "mailto:me@example.org?subject=Hello%20World&body=a+b",
];
for (const input of inputs) {
  const raw = parse(input);
  const parsed = parse(input, true);
  console.log(JSON.stringify(input));
  console.log("  string:", JSON.stringify(raw.query), raw.search);
  console.log("  parsed:", inspect(parsed.query), parsed.search, parsed.href);
  console.log("  keys:", Object.keys(parsed.query).join(","), JSON.stringify(parsed.query));
}

const typed = parse("http://example.com/?single=1&multi=a&multi=b", true);
const single = typed.query.single;
const multi = typed.query.multi;
const missing = typed.query.missing;
console.log(typeof single, single, Array.isArray(multi), multi, missing === undefined);
if (Array.isArray(multi)) console.log(multi.length, multi.join("+"));
console.log(parse("/p?x=1", false, true).query, parse("//h/p?x=1", true, true).query);
process.exitCode = 1;

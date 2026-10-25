// url.format(URL, options): the WHATWG serialization with the fragment,
// search and auth parts optionally dropped and the host optionally
// converted to Unicode (Punycode labels decoded, other labels kept);
// absent, null and undefined options keep their defaults, other values
// are read with JS truthiness, and a non-object options argument throws
// ERR_INVALID_ARG_TYPE. No legacy parse runs, so no warning prints.
import { format, type URLFormatOptions } from "node:url";

const urls = [
  "https://user:secret@xn--espaol-zwa.com:8080/p/a/t/h?query=string#hash",
  "http://xn--fiq228c.xn--fiqs8s/?q#f",
  "http://plain.example/path",
  "file:///home/user/file.txt",
  "mailto:someone@example.org",
  "data:text/plain,hello",
  "http://[::1]:3000/x?y#z",
  "foo://user@host/path?q=1#frag",
];
const options: (URLFormatOptions | undefined)[] = [
  undefined,
  {},
  { fragment: false },
  { search: false },
  { auth: false },
  { unicode: true },
  { fragment: false, search: false, auth: false, unicode: true },
  { fragment: undefined, unicode: undefined },
];
for (const href of urls) {
  const u = new URL(href);
  console.log(href);
  for (const o of options) console.log("  ", JSON.stringify(o) ?? "undefined", format(u, o));
}

const loose = { fragment: 0, search: "", auth: null, unicode: 1 } as unknown as URLFormatOptions;
console.log(format(new URL("https://u:p@xn--espaol-zwa.com/?s#h"), loose));
for (const bad of ["x", 42, true, [1]]) {
  try {
    console.log(format(new URL("http://a.example/#f"), bad as unknown as URLFormatOptions));
  } catch (e) {
    const err = e as Error & { code?: string };
    console.log(err.name, err.code, err.message);
  }
}
console.log(format(new URL("http://a.example/#f"), null as unknown as URLFormatOptions));
const mutated = new URL("http://example.com/a?b#c");
mutated.hostname = "xn--bcher-kva.example";
mutated.username = "reader";
console.log(format(mutated, { unicode: true }), format(mutated, { auth: false, unicode: true }));

import * as url from "node:url";
import { format, parse, resolve, type UrlObject, type UrlWithParsedQuery } from "node:url";

const u = parse("http://user:pw@Example.com:8080/p/a/t/h?query=string&a=1&a=2#hash", true);
console.log(u);
console.log(JSON.stringify(u), Object.keys(u).length);
const q: UrlWithParsedQuery["query"] = u.query;
console.log(q.a, q.query, u.host, u.port, u.slashes);
u.pathname = "/changed";
u.search = null;
console.log(url.format(u));
const plain = parse("/a/b?c=d");
console.log(plain.pathname, plain.query, plain.href);
const target: UrlObject = { protocol: "https", hostname: "example.com", pathname: "/x" };
target.query = { a: "1", b: ["2", "3"] };
console.log(format(target));
console.log(format("http://a.com/b c"));
console.log(format(new URL("http://user:pw@xn--espaol-zwa.com/a?b#c"), { unicode: true, auth: false }));
console.log(resolve("/one/two/three", "four"), resolve("http://example.com/one", "/two"));
console.log(url.domainToASCII("español.com"), url.domainToUnicode("xn--espaol-zwa.com"));
try {
  parse("http://xn--a.com/");
} catch (e) {
  console.log((e as Error).name, (e as NodeJS.ErrnoException).code, (e as Error).message);
}
